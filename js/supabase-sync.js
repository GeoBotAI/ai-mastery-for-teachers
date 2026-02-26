/* ============================================
   Supabase Sync - Hybrid Cache Bridge
   Reads from localStorage, writes to both
   ============================================ */

var SupabaseSync = (function() {

  // Pull all user data from Supabase into localStorage
  async function hydrateFromSupabase() {
    var sessionRes = await SupabaseClient.auth.getSession();
    var session = sessionRes.data.session;
    if (!session) return false;

    var userId = session.user.id;
    var email = session.user.email;

    try {
      var results = await Promise.all([
        SupabaseClient.from('profiles').select('*').eq('id', userId).single(),
        SupabaseClient.from('progress').select('*').eq('user_id', userId),
        SupabaseClient.from('quiz_results')
          .select('*')
          .eq('user_id', userId)
          .order('completed_at', { ascending: false })
          .limit(1)
      ]);

      var profileRes = results[0];
      var progressRes = results[1];
      var quizRes = results[2];

      // Hydrate user profile
      var profile = profileRes.data;
      if (profile) {
        StorageManager.setUser({
          email: profile.email,
          registeredAt: profile.registered_at,
          supabaseId: userId
        });
      }

      // Hydrate progress: convert flat rows to nested object
      var progress = StorageManager.initProgress();

      if (progressRes.data && progressRes.data.length > 0) {
        for (var i = 0; i < progressRes.data.length; i++) {
          var row = progressRes.data[i];
          if (progress[row.challenge_id] &&
              progress[row.challenge_id].activities[String(row.activity_index)]) {
            progress[row.challenge_id].activities[String(row.activity_index)] = {
              completed: row.completed,
              completedAt: row.completed_at
            };
          }
        }
      }

      // Recompute challengeComplete and unlocked flags
      var order = StorageManager.CHALLENGE_ORDER;
      for (var c = 0; c < order.length; c++) {
        var chId = order[c];
        var allDone = true;
        var acts = progress[chId].activities;
        for (var key in acts) {
          if (acts.hasOwnProperty(key) && !acts[key].completed) {
            allDone = false;
            break;
          }
        }
        progress[chId].challengeComplete = allDone;
        if (c === 0) {
          progress[chId].unlocked = true;
        } else {
          progress[chId].unlocked = progress[order[c - 1]].challengeComplete;
        }
      }

      StorageManager.set(StorageManager.KEYS.PROGRESS, progress);

      // Hydrate quiz result
      if (quizRes.data && quizRes.data.length > 0) {
        var q = quizRes.data[0];
        StorageManager.setQuizResult({
          score: q.score,
          total: q.total,
          percent: q.percent,
          passed: q.passed,
          completedAt: q.completed_at
        });
      } else {
        // No quiz result on server — clear local if any
        StorageManager.remove(StorageManager.KEYS.QUIZ);
      }

      return true;
    } catch (err) {
      console.error('SupabaseSync hydration error:', err);
      return false;
    }
  }

  // Push activity completion to Supabase (fire and forget)
  function pushActivityComplete(challengeId, activityIndex, completed, completedAt) {
    SupabaseClient.auth.getSession().then(function(res) {
      var session = res.data.session;
      if (!session) return;

      SupabaseClient.from('progress').upsert({
        user_id: session.user.id,
        challenge_id: challengeId,
        activity_index: parseInt(activityIndex, 10),
        completed: completed,
        completed_at: completedAt || null
      }, {
        onConflict: 'user_id,challenge_id,activity_index'
      }).then(function(res) {
        if (res.error) console.warn('Progress sync error:', res.error.message);
      });
    });
  }

  // Push quiz result to Supabase (fire and forget)
  function pushQuizResult(result) {
    SupabaseClient.auth.getSession().then(function(res) {
      var session = res.data.session;
      if (!session) return;

      SupabaseClient.from('quiz_results').insert({
        user_id: session.user.id,
        score: result.score,
        total: result.total,
        percent: result.percent,
        passed: result.passed,
        completed_at: result.completedAt || new Date().toISOString()
      }).then(function(res) {
        if (res.error) console.warn('Quiz sync error:', res.error.message);
      });
    });
  }

  // Upload gallery image to Supabase Storage, return public URL
  async function uploadGalleryImage(imageDataUrl) {
    var sessionRes = await SupabaseClient.auth.getSession();
    var session = sessionRes.data.session;
    if (!session) return null;

    try {
      // Convert data URL to Blob
      var parts = imageDataUrl.split(',');
      var byteString = atob(parts[1]);
      var mimeType = parts[0].split(':')[1].split(';')[0];
      var ab = new ArrayBuffer(byteString.length);
      var ia = new Uint8Array(ab);
      for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      var blob = new Blob([ab], { type: mimeType });

      var fileName = session.user.id + '/' + Date.now() + '.jpg';

      var uploadRes = await SupabaseClient.storage
        .from('gallery-images')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadRes.error) {
        console.error('Image upload error:', uploadRes.error.message);
        return null;
      }

      var urlRes = SupabaseClient.storage
        .from('gallery-images')
        .getPublicUrl(fileName);

      return urlRes.data.publicUrl;
    } catch (err) {
      console.error('Image upload failed:', err);
      return null;
    }
  }

  // Save gallery item metadata to Supabase DB
  async function pushGalleryItem(item, imageUrl) {
    var sessionRes = await SupabaseClient.auth.getSession();
    var session = sessionRes.data.session;
    if (!session) return false;

    var res = await SupabaseClient.from('gallery').insert({
      user_id: session.user.id,
      email: item.email || session.user.email,
      text: item.text || null,
      challenge_tag: item.challengeTag || null,
      activity_tag: item.activityTag || null,
      image_url: imageUrl || null,
      created_at: item.createdAt || new Date().toISOString()
    });

    if (res.error) {
      console.error('Gallery save error:', res.error.message);
      return false;
    }
    return true;
  }

  // Fetch all gallery items from Supabase (shared across users)
  async function fetchGalleryFromSupabase() {
    var res = await SupabaseClient.from('gallery')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (res.error) {
      console.error('Gallery fetch error:', res.error.message);
      return null;
    }

    // Transform to match existing gallery item format
    return res.data.map(function(row) {
      return {
        id: 'g_' + row.id,
        email: row.email,
        displayName: row.display_name,
        text: row.text,
        challengeTag: row.challenge_tag,
        activityTag: row.activity_tag,
        imageDataUrl: row.image_url, // Now a URL, not base64
        createdAt: row.created_at
      };
    });
  }

  return {
    hydrateFromSupabase: hydrateFromSupabase,
    pushActivityComplete: pushActivityComplete,
    pushQuizResult: pushQuizResult,
    uploadGalleryImage: uploadGalleryImage,
    pushGalleryItem: pushGalleryItem,
    fetchGalleryFromSupabase: fetchGalleryFromSupabase
  };
})();
