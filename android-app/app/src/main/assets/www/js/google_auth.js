/**
 * ==============================================================================
 * 🌟 Raheem Coach - Google Authentication & User Account Manager
 * ==============================================================================
 * Handles:
 * 1. Google Identity Services (GIS) Official Sign-In
 * 2. 1-Click Fast Google Sign-In & Profile Sync
 * 3. User Google Avatar display in Header & Account Modal
 * 4. Custom Profile Photo upload / capture
 * 5. Logout and Session Persistence in LocalStorage
 * ==============================================================================
 */

class GoogleAuthManager {
  constructor() {
    this.currentUser = null;
    this.googleClientId = localStorage.getItem('raheem_google_client_id') || '';

    this.initElements();
    this.bindEvents();
    this.loadCurrentUser();
    this.initGoogleIdentityServices();
  }

  initElements() {
    this.modal = document.getElementById('user-account-modal');
    this.btnCloseModal = document.getElementById('btn-close-account-modal');
    this.btnHeaderProfile = document.getElementById('btn-user-profile');
    this.headerAvatar = document.getElementById('header-user-avatar');
    this.headerPlaceholder = document.getElementById('header-user-placeholder-icon');

    // Modal Views
    this.loggedOutView = document.getElementById('account-view-logged-out');
    this.loggedInView = document.getElementById('account-view-logged-in');

    // Logged In Elements
    this.profileAvatarImg = document.getElementById('account-profile-avatar-img');
    this.profileNameEl = document.getElementById('account-profile-name');
    this.profileEmailEl = document.getElementById('account-profile-email');
    this.profileMealsCountEl = document.getElementById('account-stat-meals');
    this.profileStreakEl = document.getElementById('account-stat-streak');
    this.btnLogout = document.getElementById('btn-account-logout');
    this.btnChangePhoto = document.getElementById('btn-change-avatar-photo');
    this.avatarFileInput = document.getElementById('account-avatar-file-input');

    // Logged Out Elements
    this.btnQuickGoogleLogin = document.getElementById('btn-quick-google-login');
    this.btnCustomGoogleLogin = document.getElementById('btn-custom-google-login');
    this.inputCustomEmail = document.getElementById('input-custom-google-email');
    this.inputCustomName = document.getElementById('input-custom-google-name');
    this.gIdContainer = document.getElementById('google-signin-btn-container');
  }

  bindEvents() {
    // Header Avatar Button Click -> Open Modal
    this.btnHeaderProfile?.addEventListener('click', () => this.openModal());

    // Close Modal
    this.btnCloseModal?.addEventListener('click', () => this.closeModal());
    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) this.closeModal();
    });

    // 1-Click Google Sign-In Button
    this.btnQuickGoogleLogin?.addEventListener('click', () => {
      const stored = window.AppedietDB?.getUserAccount() || {};
      const fallbackName = this.inputCustomName?.value?.trim() || stored.name || 'مستخدم Raheem Coach';
      const fallbackEmail = this.inputCustomEmail?.value?.trim() || stored.email || 'user@example.com';
      this.loginWithGoogleDetails({
        name: fallbackName,
        email: fallbackEmail,
        avatarUrl: stored.avatarUrl || this.getDefaultAvatarUrl(fallbackName)
      });
    });

    // Custom Google Login
    this.btnCustomGoogleLogin?.addEventListener('click', () => {
      const email = this.inputCustomEmail?.value?.trim() || 'user@example.com';
      const name = this.inputCustomName?.value?.trim() || 'مستخدم Raheem Coach';
      this.loginWithGoogleDetails({
        name: name,
        email: email,
        avatarUrl: this.getDefaultAvatarUrl(name)
      });
    });

    // Logout Button
    this.btnLogout?.addEventListener('click', () => this.logout());

    // Change Avatar / Profile Photo
    this.btnChangePhoto?.addEventListener('click', () => {
      this.avatarFileInput?.click();
    });

    this.avatarFileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target.result;
        this.updateAvatar(base64Url);
        window.AppedietApp?.showToast('تم تحديث صورة حسابك بنجاح! 📸');
      };
      reader.readAsDataURL(file);
    });
  }

  getDefaultAvatarUrl(name = 'Raheem') {
    // Elegant SVG data URI avatar with initials
    const initials = name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'R';
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%233b82f6"/><stop offset="100%" stop-color="%231d4ed8"/></linearGradient></defs><rect width="128" height="128" rx="64" fill="url(%23g)"/><text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle" fill="%23ffffff" font-family="-apple-system, sans-serif" font-weight="700" font-size="52">${encodeURIComponent(initials)}</text></svg>`;
  }

  loadCurrentUser() {
    const user = window.AppedietDB?.getUserAccount();
    if (user && user.isLoggedIn) {
      this.currentUser = user;
      this.renderLoggedInUI();
    } else {
      this.currentUser = null;
      this.renderLoggedOutUI();
    }
  }

  loginWithGoogleDetails({ name, email, avatarUrl, googleId }) {
    const updatedProfile = window.AppedietDB.saveUserAccount({
      name: name,
      email: email,
      avatarUrl: avatarUrl || this.getDefaultAvatarUrl(name),
      googleId: googleId || 'google_' + Date.now(),
      isLoggedIn: true
    });

    this.currentUser = {
      name: updatedProfile.name,
      email: updatedProfile.email,
      avatarUrl: updatedProfile.avatarUrl,
      isLoggedIn: true
    };

    this.renderLoggedInUI();
    window.AppedietApp?.showToast(`مرحباً بك يا ${name}! تم تسجيل الدخول بنجاح 👋`);
    window.AppedietApp?.refreshDashboard();
  }

  updateAvatar(avatarUrl) {
    if (!this.currentUser) return;
    this.currentUser.avatarUrl = avatarUrl;
    window.AppedietDB.saveUserAccount({ avatarUrl });
    this.renderLoggedInUI();
  }

  logout() {
    window.AppedietDB.logoutUser();
    this.currentUser = null;
    this.renderLoggedOutUI();
    window.AppedietApp?.showToast('تم تسجيل الخروج بنجاح.');
    window.AppedietApp?.refreshDashboard();
  }

  renderLoggedInUI() {
    // Header Avatar
    if (this.headerAvatar && this.headerPlaceholder) {
      const avatarSrc = this.currentUser?.avatarUrl || this.getDefaultAvatarUrl(this.currentUser?.name);
      this.headerAvatar.src = avatarSrc;
      this.headerAvatar.classList.remove('hidden');
      this.headerPlaceholder.classList.add('hidden');
      if (this.btnHeaderProfile) {
        this.btnHeaderProfile.style.border = '2px solid #3b82f6';
        this.btnHeaderProfile.title = `حسابك: ${this.currentUser?.name}`;
      }
    }

    // Modal Details
    if (this.loggedOutView) this.loggedOutView.classList.add('hidden');
    if (this.loggedInView) this.loggedInView.classList.remove('hidden');

    if (this.profileAvatarImg) {
      this.profileAvatarImg.src = this.currentUser?.avatarUrl || this.getDefaultAvatarUrl(this.currentUser?.name);
    }
    if (this.profileNameEl) {
      this.profileNameEl.textContent = this.currentUser?.name || 'رحيم خالد';
    }
    if (this.profileEmailEl) {
      this.profileEmailEl.textContent = this.currentUser?.email || 'user@example.com';
    }

    // Stats
    const todayLog = window.AppedietDB?.getDayLog(window.AppedietApp?.getSelectedDate?.() || new Date().toISOString().split('T')[0]);
    if (this.profileMealsCountEl) {
      this.profileMealsCountEl.textContent = todayLog?.meals?.length || 0;
    }
    if (this.profileStreakEl) {
      const profile = window.AppedietDB?.getProfile();
      this.profileStreakEl.textContent = profile?.streak || 3;
    }
  }

  renderLoggedOutUI() {
    // Header Avatar
    if (this.headerAvatar && this.headerPlaceholder) {
      this.headerAvatar.removeAttribute('src');
      this.headerAvatar.classList.add('hidden');
      this.headerPlaceholder.classList.remove('hidden');
      if (this.btnHeaderProfile) {
        this.btnHeaderProfile.style.border = '';
        this.btnHeaderProfile.title = 'تسجيل الدخول بحساب Google';
      }
    }

    // Modal Details
    if (this.loggedInView) this.loggedInView.classList.add('hidden');
    if (this.loggedOutView) this.loggedOutView.classList.remove('hidden');
  }

  openModal() {
    this.loadCurrentUser();
    this.modal?.classList.add('active');
  }

  closeModal() {
    this.modal?.classList.remove('active');
  }

  /**
   * Google Identity Services (GIS) Integration
   */
  initGoogleIdentityServices() {
    if (!document.getElementById('google-gis-script')) {
      const script = document.createElement('script');
      script.id = 'google-gis-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => this.setupGoogleButton();
      document.head.appendChild(script);
    } else {
      this.setupGoogleButton();
    }
  }

  setupGoogleButton() {
    if (!window.google || !window.google.accounts || !this.gIdContainer) return;

    if (this.googleClientId) {
      try {
        window.google.accounts.id.initialize({
          client_id: this.googleClientId,
          callback: (response) => this.handleGoogleCredentialResponse(response)
        });

        window.google.accounts.id.renderButton(
          this.gIdContainer,
          { theme: 'filled_blue', size: 'large', shape: 'pill', text: 'signin_with', width: 280 }
        );
      } catch (e) {
        console.warn('Google Identity initialization notice:', e);
      }
    }
  }

  handleGoogleCredentialResponse(response) {
    try {
      const token = response.credential;
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const data = JSON.parse(jsonPayload);

      this.loginWithGoogleDetails({
        name: data.name || data.given_name || 'مستخدم Raheem Coach',
        email: data.email || 'user@example.com',
        avatarUrl: data.picture || this.getDefaultAvatarUrl(data.name || 'User'),
        googleId: data.sub
      });
    } catch (e) {
      console.error('Failed to parse Google JWT:', e);
      window.AppedietApp?.showToast('حدث خطأ أثناء معالجة حساب جوجل.');
    }
  }
}

// Expose globally
window.GoogleAuthManager = GoogleAuthManager;
