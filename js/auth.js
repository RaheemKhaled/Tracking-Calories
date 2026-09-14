/**
 * Simulated Local Authentication Service
 * Uses LocalStorage to persist multi-user sessions on the same device.
 */

class AppedietAuth {
  constructor() {
    this.usersDbKey = 'appediet_users_db';
    this.currentUserIdKey = 'appediet_current_user_id';
    this.init();
  }

  init() {
    if (!localStorage.getItem(this.usersDbKey)) {
      localStorage.setItem(this.usersDbKey, JSON.stringify([]));
    }
  }

  getUsers() {
    try {
      const users = localStorage.getItem(this.usersDbKey);
      return users ? JSON.parse(users) : [];
    } catch (e) {
      return [];
    }
  }

  isLoggedIn() {
    return !!localStorage.getItem(this.currentUserIdKey);
  }

  getCurrentUser() {
    const userId = localStorage.getItem(this.currentUserIdKey);
    if (!userId) return null;
    const users = this.getUsers();
    return users.find(u => u.id === userId) || null;
  }

  login(email, password) {
    const users = this.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    
    if (user) {
      localStorage.setItem(this.currentUserIdKey, user.id);
      return { success: true, user };
    }
    
    return { success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' };
  }

  signup(name, email, password) {
    const users = this.getUsers();
    
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, message: 'البريد الإلكتروني مسجل مسبقاً' };
    }
    
    const newUser = {
      id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name: name,
      email: email,
      password: password,
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem(this.usersDbKey, JSON.stringify(users));
    localStorage.setItem(this.currentUserIdKey, newUser.id);
    
    return { success: true, user: newUser };
  }

  logout() {
    localStorage.removeItem(this.currentUserIdKey);
  }
}

window.Auth = new AppedietAuth();
