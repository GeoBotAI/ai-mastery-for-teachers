/* ============================================
   Storage Manager - localStorage Utility Layer
   ============================================ */

var StorageManager = (function() {
  var KEYS = {
    USER: 'aimt_user',
    EMAILS: 'aimt_emails',
    PROGRESS: 'aimt_progress',
    GALLERY: 'aimt_gallery',
    QUIZ: 'aimt_quiz'
  };

  var CHALLENGE_ORDER = [
    'challenge_1',
    'challenge_2',
    'challenge_3',
    'challenge_4',
    'challenge_5',
    'challenge_6',
    'challenge_7',
    'challenge_8',
    'challenge_9',
    'challenge_10'
  ];

  var ACTIVITY_COUNTS = {
    'challenge_1': 4,
    'challenge_2': 3,
    'challenge_3': 4,
    'challenge_4': 2,
    'challenge_5': 4,
    'challenge_6': 3,
    'challenge_7': 3,
    'challenge_8': 3,
    'challenge_9': 3,
    'challenge_10': 3
  };

  function get(key, defaultValue) {
    if (defaultValue === undefined) defaultValue = null;
    try {
      var item = localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        console.warn('localStorage quota exceeded');
      }
      return false;
    }
  }

  function remove(key) {
    localStorage.removeItem(key);
  }

  // --- User ---
  function getUser() {
    return get(KEYS.USER);
  }

  function setUser(userData) {
    set(KEYS.USER, userData);
  }

  function isLoggedIn() {
    return getUser() !== null;
  }

  // --- Emails ---
  function getEmails() {
    return get(KEYS.EMAILS, []);
  }

  function addEmail(email) {
    var emails = getEmails();
    emails.push({ email: email, registeredAt: new Date().toISOString() });
    set(KEYS.EMAILS, emails);
  }

  // --- Progress ---
  function initProgress() {
    var progress = {};
    for (var i = 0; i < CHALLENGE_ORDER.length; i++) {
      var id = CHALLENGE_ORDER[i];
      var activities = {};
      for (var j = 1; j <= ACTIVITY_COUNTS[id]; j++) {
        activities[j] = { completed: false, completedAt: null };
      }
      progress[id] = {
        activities: activities,
        unlocked: i === 0,
        challengeComplete: false
      };
    }
    return progress;
  }

  function getProgress() {
    var progress = get(KEYS.PROGRESS);
    if (!progress) {
      progress = initProgress();
      set(KEYS.PROGRESS, progress);
    }
    // Ensure all challenges exist (in case new ones were added)
    for (var i = 0; i < CHALLENGE_ORDER.length; i++) {
      var id = CHALLENGE_ORDER[i];
      if (!progress[id]) {
        var activities = {};
        for (var j = 1; j <= ACTIVITY_COUNTS[id]; j++) {
          activities[j] = { completed: false, completedAt: null };
        }
        progress[id] = {
          activities: activities,
          unlocked: i === 0,
          challengeComplete: false
        };
      }
    }
    return progress;
  }

  function setActivityComplete(challengeId, activityIndex, completed) {
    var progress = getProgress();
    if (!progress[challengeId]) return;

    progress[challengeId].activities[activityIndex] = {
      completed: completed,
      completedAt: completed ? new Date().toISOString() : null
    };

    // Check if all activities complete
    var allDone = true;
    var acts = progress[challengeId].activities;
    for (var key in acts) {
      if (!acts[key].completed) {
        allDone = false;
        break;
      }
    }
    progress[challengeId].challengeComplete = allDone;

    // Unlock next challenge if complete
    if (allDone) {
      var idx = CHALLENGE_ORDER.indexOf(challengeId);
      if (idx >= 0 && idx < CHALLENGE_ORDER.length - 1) {
        progress[CHALLENGE_ORDER[idx + 1]].unlocked = true;
      }
    }

    set(KEYS.PROGRESS, progress);
    return { allDone: allDone, progress: progress };
  }

  function isChallengeComplete(challengeId) {
    var progress = getProgress();
    return progress[challengeId] ? progress[challengeId].challengeComplete : false;
  }

  function isChallengeUnlocked(challengeId) {
    var progress = getProgress();
    return progress[challengeId] ? progress[challengeId].unlocked : false;
  }

  function getCompletedCount(challengeId) {
    var progress = getProgress();
    if (!progress[challengeId]) return 0;
    var count = 0;
    var acts = progress[challengeId].activities;
    for (var key in acts) {
      if (acts[key].completed) count++;
    }
    return count;
  }

  function getTotalActivities(challengeId) {
    return ACTIVITY_COUNTS[challengeId] || 0;
  }

  function getProgressPercent(challengeId) {
    var total = getTotalActivities(challengeId);
    if (total === 0) return 0;
    return Math.round((getCompletedCount(challengeId) / total) * 100);
  }

  // --- Gallery ---
  function getGallery() {
    return get(KEYS.GALLERY, []);
  }

  function addGalleryItem(item) {
    var gallery = getGallery();
    gallery.unshift(item);
    return set(KEYS.GALLERY, gallery);
  }

  // --- Quiz ---
  function getQuizResult() {
    return get(KEYS.QUIZ, null);
  }

  function setQuizResult(result) {
    set(KEYS.QUIZ, result);
  }

  function isQuizPassed() {
    var result = getQuizResult();
    return result !== null && result.passed === true;
  }

  // --- Export ---
  function exportEmailsCSV() {
    var emails = getEmails();
    var lines = ['Email,Registered At'];
    for (var i = 0; i < emails.length; i++) {
      lines.push(emails[i].email + ',' + emails[i].registeredAt);
    }
    return lines.join('\n');
  }

  // --- Public API ---
  return {
    KEYS: KEYS,
    CHALLENGE_ORDER: CHALLENGE_ORDER,
    ACTIVITY_COUNTS: ACTIVITY_COUNTS,
    get: get,
    set: set,
    remove: remove,
    getUser: getUser,
    setUser: setUser,
    isLoggedIn: isLoggedIn,
    getEmails: getEmails,
    addEmail: addEmail,
    getProgress: getProgress,
    setActivityComplete: setActivityComplete,
    isChallengeComplete: isChallengeComplete,
    isChallengeUnlocked: isChallengeUnlocked,
    getCompletedCount: getCompletedCount,
    getTotalActivities: getTotalActivities,
    getProgressPercent: getProgressPercent,
    getGallery: getGallery,
    addGalleryItem: addGalleryItem,
    getQuizResult: getQuizResult,
    setQuizResult: setQuizResult,
    isQuizPassed: isQuizPassed,
    exportEmailsCSV: exportEmailsCSV
  };
})();
