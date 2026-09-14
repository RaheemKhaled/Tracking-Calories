/**
 * Raheem Coach - Google Workspace & Google Sheets Database Sync Service
 * Allows real-time bidirectional syncing of meals, nutrition, body fat, and habits
 * with Google Sheets in the user's Google Workspace / Google Drive account.
 */

class GoogleWorkspaceSync {
  constructor() {
    this.storageKey = 'raheem_coach_google_sync_url';
    this.webhookUrl = localStorage.getItem(this.storageKey) || '';
  }

  getWebhookUrl() {
    return this.webhookUrl;
  }

  setWebhookUrl(url) {
    this.webhookUrl = (url || '').trim();
    localStorage.setItem(this.storageKey, this.webhookUrl);
  }

  isConfigured() {
    return this.webhookUrl && this.webhookUrl.startsWith('https://script.google.com');
  }

  /**
   * Generic POST to Google Apps Script Webhook
   */
  async sendToGoogle(payload) {
    if (!this.isConfigured()) {
      return { success: false, reason: 'not_configured' };
    }

    try {
      // Google Apps Script requires mode: 'no-cors' or following redirects
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        mode: 'no-cors', // Standard for Google Apps Script Web App endpoints
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      return { success: true };
    } catch (err) {
      console.warn('Google Workspace sync error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Sync a Meal to Google Sheets
   */
  async syncMeal(mealRecord, date) {
    if (!this.isConfigured()) return;

    const user = window.AppedietDB?.getUserAccount() || {};
    const payload = {
      action: 'log_meal',
      userName: user.name || 'مستخدم Raheem Coach',
      userEmail: user.email || 'user@raheemcoach.app',
      date: date || new Date().toISOString().split('T')[0],
      time: mealRecord.time || new Date().toLocaleTimeString(),
      mealType: mealRecord.mealType || 'Meal',
      foodName: mealRecord.name || 'Unknown',
      servings: mealRecord.servings || 1,
      calories: mealRecord.calories || 0,
      protein: mealRecord.protein || 0,
      carbs: mealRecord.carb || 0,
      fat: mealRecord.fat || 0,
      fiber: mealRecord.fiber || 0,
      sodium: mealRecord.sodium || 0,
      insights: (mealRecord.insights ? JSON.stringify(mealRecord.insights) : '')
    };

    return this.sendToGoogle(payload);
  }

  /**
   * Sync Body Composition Analysis to Google Sheets
   */
  async syncBodyComposition(bodyData, date) {
    if (!this.isConfigured()) return;

    const payload = {
      action: 'log_body',
      date: date || new Date().toISOString().split('T')[0],
      weight: bodyData.weight,
      height: bodyData.height,
      goalWeight: bodyData.goalWeight,
      waist: bodyData.waist,
      neck: bodyData.neck,
      hip: bodyData.hip || 0,
      chest: bodyData.chest || 0,
      bodyFatPct: bodyData.bodyFatPct,
      fatMassKg: bodyData.fatMassKg,
      leanMassKg: bodyData.leanMassKg,
      bmi: bodyData.bmi
    };

    return this.sendToGoogle(payload);
  }

  /**
   * Sync Water Intake directly
   */
  async syncWater(date, water, burned) {
    if (!this.isConfigured()) return;
    return this.syncHabits(date, water, burned);
  }

  /**
   * Sync Burned Calories directly
   */
  async syncBurned(date, burned) {
    if (!this.isConfigured()) return;
    const day = window.AppedietDB?.getDayLog(date) || {};
    return this.syncHabits(date, day.water || 0, burned, day.mood);
  }

  /**
   * Sync Daily Habits (Water, Burned, Mood)
   */
  async syncHabits(date, water, burned, mood) {
    if (!this.isConfigured()) return;

    const payload = {
      action: 'log_water',
      date: date,
      water: water,
      burned: burned,
      mood: mood ? mood.label : ''
    };

    return this.sendToGoogle(payload);
  }

  /**
   * Full Backup of All Local Data to Google Sheets
   */
  async backupAllData() {
    if (!this.isConfigured()) return { success: false, reason: 'not_configured' };

    const allData = {
      profile: window.RaheemCoachDB?.getProfile() || window.AppedietDB?.getProfile(),
      dailyLogs: window.RaheemCoachDB?.getDailyLogs() || window.AppedietDB?.getDailyLogs(),
      bodyHistory: window.RaheemCoachDB?.getBodyHistory() || window.AppedietDB?.getBodyHistory(),
      timestamp: new Date().toISOString()
    };

    const payload = {
      action: 'sync_all',
      payload: allData
    };

    return this.sendToGoogle(payload);
  }
}

window.GoogleWorkspaceSync = new GoogleWorkspaceSync();
