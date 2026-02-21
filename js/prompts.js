/* ============================================
   PARTS Framework - Interactive Prompt Builder
   ============================================ */

var PartsFramework = (function() {

  var sections = [
    {
      letter: 'P',
      title: 'Persona',
      hint: 'Who should the AI act as?',
      placeholder: 'e.g., Act as an experienced Key Stage 2 science teacher with 15 years of classroom experience...',
      prefix: ''
    },
    {
      letter: 'A',
      title: 'Audience',
      hint: 'Who is the output for?',
      placeholder: 'e.g., Year 4 students with mixed abilities, including 3 EAL learners and 2 students with SEND...',
      prefix: 'You are creating content for'
    },
    {
      letter: 'R',
      title: 'Request',
      hint: 'What exactly do you want the AI to produce?',
      placeholder: 'e.g., Create a detailed lesson plan covering the water cycle, including starter activity, main task, and plenary...',
      prefix: ''
    },
    {
      letter: 'T',
      title: 'Tone',
      hint: 'What style or voice should it use?',
      placeholder: 'e.g., Encouraging and clear, using age-appropriate language. Professional but warm...',
      prefix: 'Use a tone that is'
    },
    {
      letter: 'S',
      title: 'Specifics',
      hint: 'Any constraints, format, length, or extra requirements?',
      placeholder: 'e.g., Include 3 differentiated activities (emerging, expected, exceeding). Keep to one page. Include success criteria and key vocabulary...',
      prefix: 'Additional requirements:'
    }
  ];

  function init(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var html = '';

    // Sections
    for (var i = 0; i < sections.length; i++) {
      var s = sections[i];
      html += '<div class="parts-section">';
      html += '<div class="parts-section__header">';
      html += '<div class="parts-section__letter">' + s.letter + '</div>';
      html += '<div>';
      html += '<div class="parts-section__title">' + s.title + '</div>';
      html += '<div class="parts-section__hint">' + s.hint + '</div>';
      html += '</div>';
      html += '</div>';
      html += '<textarea id="parts-' + s.letter.toLowerCase() + '" placeholder="' + s.placeholder + '" rows="3"></textarea>';
      html += '</div>';
    }

    // Preview
    html += '<div class="parts-preview">';
    html += '<div class="parts-preview__title">Your Generated Prompt</div>';
    html += '<div class="parts-preview__text" id="partsPreview">';
    html += '<span class="parts-preview__empty">Start typing above to see your prompt build in real-time...</span>';
    html += '</div>';
    html += '</div>';

    // Actions
    html += '<div class="parts-actions">';
    html += '<button class="btn-primary" id="partsCopy">Copy to Clipboard</button>';
    html += '<button class="btn-secondary" id="partsClear">Clear All</button>';
    html += '</div>';
    html += '<p class="copy-feedback" id="copyFeedback">Copied to clipboard!</p>';

    container.innerHTML = html;

    // Attach listeners
    var textareas = container.querySelectorAll('textarea');
    for (var t = 0; t < textareas.length; t++) {
      textareas[t].addEventListener('input', updatePreview);
    }

    document.getElementById('partsCopy').addEventListener('click', copyToClipboard);
    document.getElementById('partsClear').addEventListener('click', clearAll);
  }

  function getValues() {
    return {
      p: (document.getElementById('parts-p') || {}).value || '',
      a: (document.getElementById('parts-a') || {}).value || '',
      r: (document.getElementById('parts-r') || {}).value || '',
      t: (document.getElementById('parts-t') || {}).value || '',
      s: (document.getElementById('parts-s') || {}).value || ''
    };
  }

  function buildPrompt(vals) {
    var parts = [];

    if (vals.p.trim()) parts.push(vals.p.trim());
    if (vals.a.trim()) parts.push('You are creating content for ' + vals.a.trim() + '.');
    if (vals.r.trim()) parts.push(vals.r.trim());
    if (vals.t.trim()) parts.push('Use a tone that is ' + vals.t.trim() + '.');
    if (vals.s.trim()) parts.push('Additional requirements: ' + vals.s.trim());

    return parts.join('\n\n');
  }

  function updatePreview() {
    var vals = getValues();
    var prompt = buildPrompt(vals);
    var preview = document.getElementById('partsPreview');

    if (!prompt.trim()) {
      preview.innerHTML = '<span class="parts-preview__empty">Start typing above to see your prompt build in real-time...</span>';
    } else {
      preview.textContent = prompt;
    }
  }

  function copyToClipboard() {
    var vals = getValues();
    var prompt = buildPrompt(vals);

    if (!prompt.trim()) return;

    navigator.clipboard.writeText(prompt).then(function() {
      var feedback = document.getElementById('copyFeedback');
      feedback.classList.add('visible');
      setTimeout(function() {
        feedback.classList.remove('visible');
      }, 2000);
    }).catch(function() {
      // Fallback
      var ta = document.createElement('textarea');
      ta.value = prompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);

      var feedback = document.getElementById('copyFeedback');
      feedback.classList.add('visible');
      setTimeout(function() {
        feedback.classList.remove('visible');
      }, 2000);
    });
  }

  function clearAll() {
    var textareas = document.querySelectorAll('.parts-section textarea');
    for (var i = 0; i < textareas.length; i++) {
      textareas[i].value = '';
    }
    updatePreview();
  }

  return {
    init: init
  };
})();
