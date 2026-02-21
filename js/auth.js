/* ============================================
   Auth - Email Registration & Session Guard
   ============================================ */

var Auth = (function() {

  var FIREBASE_URL = null; // Set this to your Firebase Realtime Database URL
  // Example: 'https://your-project.firebaseio.com/emails.json'

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function registerEmail(email) {
    email = email.trim().toLowerCase();

    // Save to localStorage
    StorageManager.setUser({
      email: email,
      registeredAt: new Date().toISOString()
    });
    StorageManager.addEmail(email);

    // POST to Firebase (fire and forget)
    if (FIREBASE_URL) {
      fetch(FIREBASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          registeredAt: new Date().toISOString()
        })
      }).catch(function() {});
    }
  }

  function guardPage() {
    var path = window.location.pathname.toLowerCase();
    var isLoginPage = path.indexOf('login') !== -1;
    var isWelcomePage = path.endsWith('/') || path.endsWith('index.html') || path === '';

    if (isWelcomePage || isLoginPage) return;

    if (!StorageManager.isLoggedIn()) {
      window.location.href = 'login.html';
    }
  }

  function logout() {
    StorageManager.remove(StorageManager.KEYS.USER);
    window.location.href = 'index.html';
  }

  return {
    FIREBASE_URL: FIREBASE_URL,
    isValidEmail: isValidEmail,
    registerEmail: registerEmail,
    guardPage: guardPage,
    logout: logout
  };
})();
