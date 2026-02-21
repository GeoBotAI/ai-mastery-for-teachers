/* ============================================
   Challenges - Data Loading, Progress, Unlock Logic
   ============================================ */

var Challenges = (function() {

  var challengeData = null;

  function loadData(callback) {
    if (challengeData) {
      callback(challengeData);
      return;
    }
    fetch('data/challenges.json?v=3')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        challengeData = data;
        callback(data);
      })
      .catch(function(err) {
        console.error('Failed to load challenges:', err);
      });
  }

  function findChallenge(data, challengeId) {
    for (var p = 0; p < data.phases.length; p++) {
      var phase = data.phases[p];
      for (var c = 0; c < phase.challenges.length; c++) {
        if (phase.challenges[c].id === challengeId) {
          return { challenge: phase.challenges[c], phase: phase };
        }
      }
    }
    return null;
  }

  function getModeIcon(mode) {
    switch (mode) {
      case 'individual': return '\u{1F464}';
      case 'pairs': return '\u{1F465}';
      case 'group': return '\u{1F465}\u{1F465}';
      default: return '';
    }
  }

  function getModeLabel(mode) {
    switch (mode) {
      case 'individual': return 'Individual';
      case 'pairs': return 'Pairs';
      case 'group': return 'Group';
      default: return mode || '';
    }
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // --- Render Challenge List (challenges.html) ---
  function renderList(containerId) {
    loadData(function(data) {
      var container = document.getElementById(containerId);
      if (!container) return;

      var progress = StorageManager.getProgress();
      var html = '';

      for (var p = 0; p < data.phases.length; p++) {
        var phase = data.phases[p];
        html += '<div class="phase-section fade-in">';
        html += '<h2 class="phase-header">' + escapeHtml(phase.title) + '</h2>';
        html += '<p class="phase-focus">' + escapeHtml(phase.focus) + '</p>';

        for (var c = 0; c < phase.challenges.length; c++) {
          var ch = phase.challenges[c];
          var completed = StorageManager.getCompletedCount(ch.id);
          var total = StorageManager.getTotalActivities(ch.id);
          var percent = StorageManager.getProgressPercent(ch.id);
          var unlocked = StorageManager.isChallengeUnlocked(ch.id);
          var isComplete = StorageManager.isChallengeComplete(ch.id);

          var cardClass = 'challenge-card';
          if (!unlocked) cardClass += ' locked';
          if (isComplete) cardClass += ' completed';

          var statusIcon = '';
          if (isComplete) statusIcon = '\u2713';
          else if (!unlocked) statusIcon = '\u{1F512}';

          var href = 'challenge.html?id=' + ch.id;

          html += '<a href="' + href + '" class="' + cardClass + '">';
          html += '<div class="challenge-card__number">' + escapeHtml(ch.number) + '</div>';
          html += '<div class="challenge-card__body">';
          html += '<div class="challenge-card__title">' + escapeHtml(ch.title) + '</div>';
          html += '<div class="challenge-card__focus">' + escapeHtml(ch.focus) + '</div>';
          html += '<div class="challenge-card__status">';
          html += '<span>' + completed + '/' + total + '</span>';
          html += '<div class="progress-bar"><div class="progress-bar__fill" style="width:' + percent + '%"></div></div>';
          html += '</div>';
          html += '</div>';
          html += '<div class="challenge-card__icon">' + statusIcon + '</div>';
          html += '</a>';
        }

        html += '</div>';
      }

      container.innerHTML = html;
    });
  }

  // --- Render Single Challenge Detail (challenge.html) ---
  function renderDetail(containerId) {
    var params = new URLSearchParams(window.location.search);
    var challengeId = params.get('id');

    if (!challengeId) {
      window.location.href = 'challenges.html';
      return;
    }

    loadData(function(data) {
      var container = document.getElementById(containerId);
      if (!container) return;

      var result = findChallenge(data, challengeId);
      if (!result) {
        container.innerHTML = '<p class="text-center text-muted mt-4">Challenge not found.</p>';
        return;
      }

      var ch = result.challenge;
      var phase = result.phase;
      var progress = StorageManager.getProgress();
      var chProgress = progress[challengeId];
      var isLocked = !chProgress || !chProgress.unlocked;

      var completed = isLocked ? 0 : StorageManager.getCompletedCount(challengeId);
      var total = StorageManager.getTotalActivities(challengeId);
      var percent = isLocked ? 0 : StorageManager.getProgressPercent(challengeId);

      var html = '';

      // Back link
      html += '<a href="challenges.html" class="back-link">&larr; Back to Challenges</a>';

      // Header
      html += '<div class="challenge-header">';
      html += '<div class="challenge-phase-label">' + escapeHtml(phase.title) + '</div>';
      html += '<h1 class="challenge-title">Challenge ' + escapeHtml(ch.number) + ': ' + escapeHtml(ch.title) + '</h1>';
      html += '<p class="challenge-focus">' + escapeHtml(ch.focus) + '</p>';
      html += '</div>';

      // Progress
      html += '<div class="challenge-progress-summary">';
      html += '<span>' + completed + ' of ' + total + ' activities complete</span>';
      html += '<div class="progress-bar progress-bar--large" style="flex:1"><div class="progress-bar__fill" style="width:' + percent + '%"></div></div>';
      html += '</div>';

      // Locked banner
      if (isLocked) {
        html += '<div class="callout callout--tip" style="border-color:var(--color-accent); background:rgba(232,115,209,0.1);">';
        html += '<div class="callout__label" style="color:var(--color-accent);">&#128274; Challenge Locked</div>';
        html += '<div>Complete the previous challenge to unlock this one. You can preview the activities below.</div>';
        html += '</div>';
      }

      // Overview
      html += '<div class="challenge-overview">' + escapeHtml(ch.overview) + '</div>';

      // Activities
      for (var i = 0; i < ch.activities.length; i++) {
        var act = ch.activities[i];
        var actProgress = (!isLocked && chProgress) ? chProgress.activities[act.index] : null;
        var isCompleted = actProgress ? actProgress.completed : false;

        var actClass = 'activity-card fade-in';
        if (isCompleted) actClass += ' completed';

        html += '<div class="' + actClass + '" data-activity="' + act.index + '">';

        // Header
        html += '<div class="activity-card__header">';
        html += '<div class="activity-card__title-group">';
        html += '<span class="activity-card__number">' + act.index + '</span>';
        html += '<span class="activity-card__title">' + escapeHtml(act.title) + '</span>';
        html += '</div>';
        html += '<span class="activity-card__mode">' + getModeIcon(act.mode) + ' ' + getModeLabel(act.mode) + '</span>';
        html += '</div>';

        // The Task
        html += '<div class="activity-section">';
        html += '<div class="activity-section__label">The Task</div>';
        html += '<div class="activity-section__content">' + escapeHtml(act.task) + '</div>';
        html += '</div>';

        // The Why
        html += '<div class="activity-section">';
        html += '<div class="activity-section__label">The Why</div>';
        html += '<div class="activity-section__content">' + escapeHtml(act.why) + '</div>';
        html += '</div>';

        // Suggested Tools
        if (act.suggestedTools && act.suggestedTools.length > 0) {
          html += '<div class="activity-section">';
          html += '<div class="activity-section__label">Suggested Tools</div>';
          html += '<div class="tool-pills">';
          for (var t = 0; t < act.suggestedTools.length; t++) {
            var toolSlug = act.suggestedTools[t].toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
            html += '<a href="tools.html#' + toolSlug + '" class="tool-pill">' + escapeHtml(act.suggestedTools[t]) + '</a>';
          }
          html += '</div></div>';
        }

        // Pro Tips
        if (act.proTips && act.proTips.length > 0) {
          for (var pt = 0; pt < act.proTips.length; pt++) {
            html += '<div class="callout callout--tip">';
            html += '<div class="callout__label">\u{1F4A1} Pro-Tip</div>';
            html += '<div>' + escapeHtml(act.proTips[pt]) + '</div>';
            html += '</div>';
          }
        }

        // Prompt Ideas
        if (act.promptIdeas && act.promptIdeas.length > 0) {
          for (var pi = 0; pi < act.promptIdeas.length; pi++) {
            html += '<div class="callout callout--prompt">';
            html += '<div class="callout__label">\u{1F680} Prompt Idea</div>';
            html += '<div>' + escapeHtml(act.promptIdeas[pi]) + '</div>';
            html += '</div>';
          }
        }

        // How to do it
        if (act.howToDoIt) {
          html += '<div class="callout callout--howto">';
          html += '<div class="callout__label">\u2699\uFE0F How To Do It</div>';
          html += '<div>' + escapeHtml(act.howToDoIt) + '</div>';
          html += '</div>';
        }

        // Checkbox (only show if unlocked)
        if (!isLocked) {
          html += '<div class="activity-checkbox" data-challenge="' + challengeId + '" data-activity="' + act.index + '">';
          html += '<div class="activity-checkbox__box' + (isCompleted ? ' checked' : '') + '"></div>';
          html += '<span class="activity-checkbox__label">' + (isCompleted ? 'Completed!' : 'Mark as complete') + '</span>';
          html += '</div>';
        }

        html += '</div>';
      }

      container.innerHTML = html;

      // Attach checkbox event listeners
      var checkboxes = container.querySelectorAll('.activity-checkbox');
      for (var cb = 0; cb < checkboxes.length; cb++) {
        checkboxes[cb].addEventListener('click', handleCheckboxClick);
      }
    });
  }

  function handleCheckboxClick(e) {
    var el = e.currentTarget;
    var challengeId = el.getAttribute('data-challenge');
    var activityIndex = parseInt(el.getAttribute('data-activity'));
    var box = el.querySelector('.activity-checkbox__box');
    var label = el.querySelector('.activity-checkbox__label');

    var isCurrentlyCompleted = box.classList.contains('checked');
    var newState = !isCurrentlyCompleted;

    var result = StorageManager.setActivityComplete(challengeId, activityIndex, newState);

    box.classList.toggle('checked', newState);
    label.textContent = newState ? 'Completed!' : 'Mark as complete';

    // Update the activity card
    var card = el.closest('.activity-card');
    if (card) {
      card.classList.toggle('completed', newState);
    }

    // Update progress bar
    updateProgressBar(challengeId);

    // Check if challenge is now complete
    if (result.allDone && newState) {
      showCelebration(challengeId);
    }
  }

  function updateProgressBar(challengeId) {
    var completed = StorageManager.getCompletedCount(challengeId);
    var total = StorageManager.getTotalActivities(challengeId);
    var percent = StorageManager.getProgressPercent(challengeId);

    var summary = document.querySelector('.challenge-progress-summary');
    if (summary) {
      summary.querySelector('span').textContent = completed + ' of ' + total + ' activities complete';
      summary.querySelector('.progress-bar__fill').style.width = percent + '%';
    }
  }

  function showCelebration(challengeId) {
    var isLastChallenge = challengeId === StorageManager.CHALLENGE_ORDER[StorageManager.CHALLENGE_ORDER.length - 1];
    var subText = isLastChallenge
      ? 'You have completed all challenges! You are now an AI Master!'
      : 'Great work! The next challenge is now unlocked.';

    var overlay = document.createElement('div');
    overlay.className = 'celebration-overlay';
    overlay.innerHTML =
      '<div class="celebration-overlay__text">' + (isLastChallenge ? 'All Challenges Complete!' : 'Challenge Complete!') + '</div>' +
      '<p class="celebration-overlay__sub">' + subText + '</p>' +
      '<button class="btn-primary" onclick="this.closest(\'.celebration-overlay\').remove(); window.location.href=\'challenges.html\'">Continue</button>';

    document.body.appendChild(overlay);

    // Trigger animation
    requestAnimationFrame(function() {
      overlay.classList.add('active');
    });

    // Also close on overlay click (outside content)
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        overlay.remove();
        window.location.href = 'challenges.html';
      }
    });
  }

  return {
    loadData: loadData,
    renderList: renderList,
    renderDetail: renderDetail
  };
})();
