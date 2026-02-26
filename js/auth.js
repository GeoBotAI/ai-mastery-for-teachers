/* ============================================
   Auth - Supabase Email + Password Authentication
   ============================================ */

var Auth = (function() {

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Sign up with email + password
  async function signUp(email, password) {
    email = email.trim().toLowerCase();

    var res = await SupabaseClient.auth.signUp({
      email: email,
      password: password
    });

    if (res.error) {
      return { success: false, error: res.error.message };
    }

    // If email confirmation is required, user gets a session but
    // needs to confirm before they can sign in again
    if (res.data.user && !res.data.session) {
      return { success: true, needsConfirmation: true };
    }

    if (res.data.session) {
      // Immediate login (confirmation disabled)
      StorageManager.setUser({
        email: email,
        registeredAt: new Date().toISOString(),
        supabaseId: res.data.user.id
      });
      await SupabaseSync.hydrateFromSupabase();
      return { success: true, needsConfirmation: false };
    }

    // Supabase returns user but identities array is empty if
    // the user already exists — treat as "already registered"
    if (res.data.user && res.data.user.identities && res.data.user.identities.length === 0) {
      return { success: false, error: 'An account with this email already exists. Please log in instead.' };
    }

    return { success: true, needsConfirmation: true };
  }

  // Sign in with email + password
  async function signIn(email, password) {
    email = email.trim().toLowerCase();

    var res = await SupabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (res.error) {
      var msg = res.error.message;
      if (msg.indexOf('Invalid login') !== -1) {
        msg = 'Incorrect email or password. Please try again.';
      } else if (msg.indexOf('Email not confirmed') !== -1) {
        msg = 'Please check your inbox and confirm your email before logging in.';
      }
      return { success: false, error: msg };
    }

    // Hydrate localStorage from Supabase
    StorageManager.setUser({
      email: email,
      registeredAt: new Date().toISOString(),
      supabaseId: res.data.user.id
    });
    await SupabaseSync.hydrateFromSupabase();

    return { success: true };
  }

  // Forgot password
  async function resetPassword(email) {
    email = email.trim().toLowerCase();
    var res = await SupabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/login.html'
    });
    if (res.error) {
      return { success: false, error: res.error.message };
    }
    return { success: true };
  }

  // Guard protected pages - checks Supabase session
  async function guardPage() {
    var path = window.location.pathname.toLowerCase();
    var isLoginPage = path.indexOf('login') !== -1;
    var isWelcomePage = path.endsWith('/') || path.endsWith('index.html') || path === '';

    if (isWelcomePage || isLoginPage) return;

    var sessionRes = await SupabaseClient.auth.getSession();
    if (!sessionRes.data.session) {
      StorageManager.remove(StorageManager.KEYS.USER);
      StorageManager.remove(StorageManager.KEYS.PROGRESS);
      StorageManager.remove(StorageManager.KEYS.QUIZ);
      window.location.href = 'login.html';
      return;
    }

    // If localStorage is empty but session exists, re-hydrate
    if (!StorageManager.isLoggedIn()) {
      await SupabaseSync.hydrateFromSupabase();
    }
  }

  // Logout
  async function logout() {
    await SupabaseClient.auth.signOut();
    StorageManager.remove(StorageManager.KEYS.USER);
    StorageManager.remove(StorageManager.KEYS.PROGRESS);
    StorageManager.remove(StorageManager.KEYS.QUIZ);
    StorageManager.remove(StorageManager.KEYS.GALLERY);
    window.location.href = 'index.html';
  }

  function isLoggedIn() {
    return StorageManager.isLoggedIn();
  }

  return {
    isValidEmail: isValidEmail,
    signUp: signUp,
    signIn: signIn,
    resetPassword: resetPassword,
    guardPage: guardPage,
    logout: logout,
    isLoggedIn: isLoggedIn
  };
})();
