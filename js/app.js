/* ============================================
   App - Shared Navigation, Logo, Page Init
   ============================================ */

var App = (function() {

  function getCurrentPage() {
    var path = window.location.pathname;
    var filename = path.split('/').pop().toLowerCase();
    if (!filename || filename === '' || filename === 'index.html') return 'index';
    return filename.replace('.html', '');
  }

  function injectNavBar() {
    var page = getCurrentPage();
    if (page === 'index' || page === 'login') return;

    var nav = document.createElement('nav');
    nav.className = 'main-nav';

    var links = [
      { href: 'dashboard.html', label: 'My Learning', page: 'dashboard' },
      { href: 'quiz.html', label: 'Assessment', page: 'quiz' },
      { href: 'challenges.html', label: 'Challenges', page: 'challenges' },
      { href: 'gallery.html', label: 'Gallery', page: 'gallery' },
      { href: 'tools.html', label: 'Tools', page: 'tools' },
      { href: 'prompts.html', label: 'Prompts', page: 'prompts' }
    ];

    var linksHtml = links.map(function(link) {
      var activeClass = (page === link.page || (page === 'challenge' && link.page === 'challenges')) ? ' active' : '';
      return '<a href="' + link.href + '" class="' + activeClass + '">' + link.label + '</a>';
    }).join('');

    // Add logout button
    linksHtml += '<a href="#" class="nav-logout" id="navLogout">Logout</a>';

    nav.innerHTML =
      '<a href="menu.html" class="nav-brand">AI Mastery</a>' +
      '<div class="nav-links">' + linksHtml + '</div>' +
      '<button class="nav-hamburger" aria-label="Toggle menu">&#9776;</button>';

    document.body.prepend(nav);

    // Hamburger toggle
    var hamburger = nav.querySelector('.nav-hamburger');
    var navLinks = nav.querySelector('.nav-links');
    hamburger.addEventListener('click', function() {
      navLinks.classList.toggle('open');
    });

    // Close nav when clicking a link on mobile
    var allLinks = navLinks.querySelectorAll('a');
    for (var i = 0; i < allLinks.length; i++) {
      allLinks[i].addEventListener('click', function() {
        navLinks.classList.remove('open');
      });
    }

    // Logout handler
    var logoutBtn = document.getElementById('navLogout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        Auth.logout();
      });
    }
  }

  async function init() {
    await Auth.guardPage();
    injectNavBar();
    // Signal that auth + hydration is complete
    document.dispatchEvent(new Event('app:ready'));
  }

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { init(); });
  } else {
    init();
  }

  return {
    getCurrentPage: getCurrentPage,
    init: init
  };
})();
