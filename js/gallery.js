/* ============================================
   Gallery - Shared Teacher Showcase with Supabase
   ============================================ */

var Gallery = (function() {

  var lightboxEl = null;

  function compressImage(file, maxWidth, quality) {
    maxWidth = maxWidth || 800;
    quality = quality || 0.6;
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
          var canvas = document.createElement('canvas');
          var ratio = Math.min(maxWidth / img.width, 1);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    var d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // --- Supabase operations ---
  function fetchGalleryItems(callback) {
    SupabaseSync.fetchGalleryFromSupabase()
      .then(function(items) {
        if (items && items.length > 0) {
          callback(items);
        } else {
          // Fallback to localStorage
          callback(StorageManager.getGallery());
        }
      })
      .catch(function() {
        // Fallback to localStorage
        callback(StorageManager.getGallery());
      });
  }

  function saveGalleryItem(item, callback) {
    (async function() {
      try {
        var imageUrl = null;
        if (item.imageDataUrl) {
          imageUrl = await SupabaseSync.uploadGalleryImage(item.imageDataUrl);
        }
        var saved = await SupabaseSync.pushGalleryItem(item, imageUrl);
        if (!saved) {
          // Fallback to localStorage
          StorageManager.addGalleryItem(item);
        }
        callback(true);
      } catch (err) {
        console.error('Gallery save error:', err);
        // Fallback to localStorage
        StorageManager.addGalleryItem(item);
        callback(true);
      }
    })();
  }

  // --- UI ---
  function init(formId, gridId) {
    var form = document.getElementById(formId);
    var grid = document.getElementById(gridId);
    if (!form || !grid) return;

    setupForm(form, grid);
    loadGallery(grid);
    setupLightbox();
  }

  function setupForm(form, grid) {
    var fileInput = form.querySelector('input[type="file"]');
    var fileName = form.querySelector('.file-upload__name');
    var textarea = form.querySelector('textarea');
    var submitBtn = form.querySelector('button[type="submit"]');
    var selectedFile = null;

    fileInput.addEventListener('change', function() {
      if (this.files && this.files[0]) {
        selectedFile = this.files[0];
        fileName.textContent = selectedFile.name;
      } else {
        selectedFile = null;
        fileName.textContent = 'No file chosen';
      }
    });

    form.addEventListener('submit', function(e) {
      e.preventDefault();

      var text = textarea.value.trim();
      if (!text && !selectedFile) {
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      // Get challenge/activity tags
      var challengeTag = (document.getElementById('galleryChallenge') || {}).value || '';
      var activityTag = (document.getElementById('galleryActivity') || {}).value || '';

      var processSubmission = function(imageDataUrl) {
        var user = StorageManager.getUser();
        var item = {
          id: 'g_' + Date.now(),
          email: user ? user.email : 'anonymous',
          text: text,
          challengeTag: challengeTag,
          activityTag: activityTag,
          imageDataUrl: imageDataUrl || null,
          createdAt: new Date().toISOString()
        };

        saveGalleryItem(item, function() {
          textarea.value = '';
          fileInput.value = '';
          fileName.textContent = 'No file chosen';
          selectedFile = null;
          submitBtn.disabled = false;
          submitBtn.textContent = 'Share with Gallery';
          // Reset tag selects
          var chSel = document.getElementById('galleryChallenge');
          var acSel = document.getElementById('galleryActivity');
          if (chSel) chSel.value = '';
          if (acSel) { acSel.innerHTML = '<option value="">-- Select Activity --</option>'; }
          loadGallery(grid);
        });
      };

      if (selectedFile) {
        compressImage(selectedFile).then(processSubmission).catch(function() {
          processSubmission(null);
        });
      } else {
        processSubmission(null);
      }
    });
  }

  function loadGallery(grid) {
    grid.innerHTML = '<p class="text-center text-muted">Loading gallery...</p>';

    fetchGalleryItems(function(items) {
      if (items.length === 0) {
        grid.innerHTML = '<p class="text-center text-muted mt-4">No submissions yet. Be the first to share your work!</p>';
        return;
      }

      var html = '';
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        html += '<div class="gallery-card">';

        if (item.imageDataUrl) {
          html += '<div class="gallery-card__image-wrap" data-image="' + i + '">';
          html += '<img src="' + item.imageDataUrl + '" alt="Teacher submission" loading="lazy">';
          html += '</div>';
        }

        html += '<div class="gallery-card__content">';
        if (item.challengeTag) {
          html += '<div style="margin-bottom:0.5rem;">';
          html += '<span class="tool-pill" style="font-size:0.7rem; cursor:default;">' + escapeHtml(item.challengeTag) + '</span>';
          if (item.activityTag) {
            html += ' <span class="tool-pill" style="font-size:0.7rem; cursor:default; border-color:var(--color-title); color:var(--color-title); background:rgba(255,215,0,0.1);">' + escapeHtml(item.activityTag) + '</span>';
          }
          html += '</div>';
        }
        if (item.email) {
          html += '<span class="gallery-card__author">' + escapeHtml(item.email) + '</span>';
        }
        if (item.text) {
          html += '<p class="gallery-card__text">' + escapeHtml(item.text) + '</p>';
        }
        html += '<span class="gallery-card__meta">' + formatDate(item.createdAt) + '</span>';
        html += '</div>';
        html += '</div>';
      }

      grid.innerHTML = html;

      // Attach lightbox clicks
      var imageWraps = grid.querySelectorAll('.gallery-card__image-wrap');
      for (var w = 0; w < imageWraps.length; w++) {
        (function(wrap, idx) {
          wrap.addEventListener('click', function() {
            var img = wrap.querySelector('img');
            var card = wrap.closest('.gallery-card');
            var textEl = card.querySelector('.gallery-card__text');
            var caption = textEl ? textEl.textContent : '';
            openLightbox(img.src, caption);
          });
        })(imageWraps[w], w);
      }
    });
  }

  function setupLightbox() {
    lightboxEl = document.createElement('div');
    lightboxEl.className = 'lightbox';
    lightboxEl.innerHTML =
      '<button class="lightbox__close" aria-label="Close">&times;</button>' +
      '<img class="lightbox__image" src="" alt="Full size image">' +
      '<p class="lightbox__caption"></p>';

    document.body.appendChild(lightboxEl);

    lightboxEl.querySelector('.lightbox__close').addEventListener('click', closeLightbox);
    lightboxEl.addEventListener('click', function(e) {
      if (e.target === lightboxEl) closeLightbox();
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && lightboxEl.classList.contains('active')) {
        closeLightbox();
      }
    });
  }

  function openLightbox(imgSrc, caption) {
    if (!lightboxEl) return;
    lightboxEl.querySelector('.lightbox__image').src = imgSrc;
    lightboxEl.querySelector('.lightbox__caption').textContent = caption || '';
    lightboxEl.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightboxEl) return;
    lightboxEl.classList.remove('active');
    document.body.style.overflow = '';
  }

  return {
    init: init,
    fetchGalleryItems: fetchGalleryItems
  };
})();
