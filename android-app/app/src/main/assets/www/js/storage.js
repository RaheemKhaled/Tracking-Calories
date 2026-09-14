/**
 * Appediet Local Storage & State Management
 * Persistent storage for user profile, daily logs, meals, water, body analyses, and settings.
 */

const STORAGE_KEYS = {
  PROFILE: 'appediet_profile',
  DAILY_LOGS: 'appediet_daily_logs',
  BODY_HISTORY: 'appediet_body_history',
  SETTINGS: 'appediet_settings',
  SELECTED_DATE: 'appediet_selected_date'
};

const DEFAULT_PROFILE = {
  name: 'صديق Raheem Coach',
  currentWeight: 95, // kg (matches user screenshot)
  goalWeight: 80,    // kg (matches user screenshot)
  height: 180,       // cm
  age: 28,
  gender: 'male',
  activityLevel: 'moderate', // sedentary, light, moderate, active
  calorieGoal: 1400, // kcal (matches user screenshot: Remaining 1400 / Goal 1400)
  carbGoal: 140,     // g (matches user screenshot)
  proteinGoal: 88,   // g (matches user screenshot)
  fatGoal: 54,       // g (matches user screenshot)
  waterGoal: 64,     // fl oz (8 cups of 8 fl oz = 64 fl oz / approx 1900 ml)
  streak: 3
};

class AppedietStorage {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.PROFILE)) {
      this.saveProfile(DEFAULT_PROFILE);
    }
    if (!localStorage.getItem(STORAGE_KEYS.DAILY_LOGS)) {
      this.saveDailyLogs({});
    }
    if (!localStorage.getItem(STORAGE_KEYS.BODY_HISTORY)) {
      // Seed an initial analysis matching the 95kg profile
      const initialBody = {
        date: new Date().toISOString(),
        weight: 95,
        height: 180,
        waist: 98,
        neck: 40,
        hip: 104,
        chest: 102,
        bodyFatPercent: 26.8,
        fatMassKg: 25.5,
        leanMassKg: 69.5,
        fatDistribution: {
          abdomen: 42,
          chest: 22,
          flanks: 24,
          thighs: 12
        },
        aiNotes: 'تتركز الدهون بشكل أساسي في منطقة البطن والحشوية والخواصر (Visceral & Abdominal). يوصى بعجز سعرات معتدل (400-500 سعر)، والتركيز على البروتين لحماية العضلات وزيادة النشاط اليومي NEAT (8000 إلى 10000 خطوة).'
      };
      localStorage.setItem(STORAGE_KEYS.BODY_HISTORY, JSON.stringify([initialBody]));
    }
  }

  getProfile() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return data ? { ...DEFAULT_PROFILE, ...JSON.parse(data) } : DEFAULT_PROFILE;
    } catch (e) {
      console.error('Error reading profile:', e);
      return DEFAULT_PROFILE;
    }
  }

  saveProfile(profile) {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  }

  getUserAccount() {
    const profile = this.getProfile();
    return {
      name: profile.name || 'مستخدم Raheem Coach',
      email: profile.email || '',
      avatarUrl: profile.avatarUrl || '',
      isLoggedIn: !!profile.isLoggedIn,
      googleId: profile.googleId || ''
    };
  }

  saveUserAccount(data) {
    const profile = this.getProfile();
    if (data.name) profile.name = data.name;
    if (data.email) profile.email = data.email;
    if (data.avatarUrl !== undefined) profile.avatarUrl = data.avatarUrl;
    if (data.googleId) profile.googleId = data.googleId;
    profile.isLoggedIn = data.isLoggedIn !== undefined ? data.isLoggedIn : true;
    this.saveProfile(profile);
    return profile;
  }

  logoutUser() {
    const profile = this.getProfile();
    profile.isLoggedIn = false;
    this.saveProfile(profile);
    return profile;
  }

  /**
   * Recalculate daily calorie and macro goals automatically based on weight, height, age, gender, and goal weight
   */
  calculateGoals(profile) {
    const w = parseFloat(profile.currentWeight) || 95;
    const h = parseFloat(profile.height) || 180;
    const a = parseFloat(profile.age) || 28;
    const g = profile.gender || 'male';
    const targetW = parseFloat(profile.goalWeight) || 80;

    // Mifflin-St Jeor BMR formula
    let bmr = (10 * w) + (6.25 * h) - (5 * a);
    if (g === 'male') {
      bmr += 5;
    } else {
      bmr -= 161;
    }

    // Activity multiplier
    const actMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725
    };
    const tdee = Math.round(bmr * (actMultipliers[profile.activityLevel] || 1.4));

    // Deficit for weight loss (aiming for steady, sustainable loss)
    let calorieGoal;
    if (w > targetW) {
      calorieGoal = Math.max(1200, Math.round(tdee - 500));
    } else if (w < targetW) {
      calorieGoal = Math.round(tdee + 300);
    } else {
      calorieGoal = tdee;
    }

    // Protein: 1.6 - 2.0g per kg of lean mass or ~ 1.0 - 1.2g per kg total weight for calorie deficit
    const proteinGoal = Math.round(Math.min(w * 1.6, calorieGoal * 0.25 / 4));
    // Fat: 25% of calories
    const fatGoal = Math.round((calorieGoal * 0.25) / 9);
    // Carbs: Remaining calories
    const carbGoal = Math.round((calorieGoal - (proteinGoal * 4) - (fatGoal * 9)) / 4);

    return {
      calorieGoal,
      proteinGoal: Math.max(60, proteinGoal),
      fatGoal: Math.max(35, fatGoal),
      carbGoal: Math.max(80, carbGoal)
    };
  }

  getDailyLogs() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DAILY_LOGS);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  saveDailyLogs(logs) {
    localStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(logs));
  }

  /**
   * Get log for a specific date (YYYY-MM-DD)
   */
  getDayLog(dateStr) {
    const logs = this.getDailyLogs();
    if (!logs[dateStr]) {
      return {
        date: dateStr,
        water: 0,
        burned: 0,
        mood: null,
        meals: []
      };
    }
    return logs[dateStr];
  }

  /**
   * Save log for a specific date
   */
  saveDayLog(dateStr, dayData) {
    const logs = this.getDailyLogs();
    logs[dateStr] = dayData;
    this.saveDailyLogs(logs);
  }

  /**
   * Add a logged meal to a specific date
   */
  addMeal(dateStr, mealItem) {
    const day = this.getDayLog(dateStr);
    if (!day.meals) day.meals = [];
    mealItem.id = 'meal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    mealItem.loggedAt = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    day.meals.push(mealItem);
    this.saveDayLog(dateStr, day);
    return mealItem;
  }

  /**
   * Get a specific meal by ID
   */
  getMeal(dateStr, mealId) {
    const day = this.getDayLog(dateStr);
    return (day.meals || []).find(m => m.id === mealId) || null;
  }

  /**
   * Update an existing logged meal
   */
  updateMeal(dateStr, mealId, updatedData) {
    const day = this.getDayLog(dateStr);
    if (!day.meals) day.meals = [];
    const idx = day.meals.findIndex(m => m.id === mealId);
    if (idx !== -1) {
      day.meals[idx] = {
        ...day.meals[idx],
        ...updatedData,
        id: mealId,
        updatedAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      };
      this.saveDayLog(dateStr, day);
      return day.meals[idx];
    }
    return null;
  }

  /**
   * Delete a meal
   */
  deleteMeal(dateStr, mealId) {
    const day = this.getDayLog(dateStr);
    if (day.meals) {
      day.meals = day.meals.filter(m => m.id !== mealId);
      this.saveDayLog(dateStr, day);
    }
  }

  /**
   * Get Active Day Date string considering user's 4:00 AM - 12:00 AM window
   * 4:00 AM - 12:00 AM (midnight) -> Current Day
   * After 12:00 AM midnight (00:00 - 04:00 AM) -> New Day
   */
  getActiveDateForEntry(now = new Date()) {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Get Water Window Info (4:00 AM to 12:00 AM cutoff)
   */
  getWaterWindowInfo(now = new Date()) {
    const hours = now.getHours();
    const isNewDaySlot = (hours >= 0 && hours < 4);
    return {
      isNewDaySlot,
      statusText: isNewDaySlot 
        ? 'أنت الآن بعد 12:00 منتصف الليل — يُحتسب الماء والوجبات تلقائياً على اليوم الجديد 🌅'
        : 'فترة التسجيل والتعديل اليومية نشطة (من 4:00 فجراً حتى 12:00 منتصف الليل) ⏱️',
      cutoffHour: 24, // 12:00 AM midnight
      startHour: 4
    };
  }

  /**
   * Update water intake for a date (supports glasses or ml)
   */
  updateWater(dateStr, amount, unit = 'glasses') {
    const day = this.getDayLog(dateStr);
    let glasses = 0;
    let ml = 0;

    if (unit === 'ml') {
      ml = Math.max(0, parseInt(amount) || 0);
      glasses = Math.round(ml / 250);
    } else {
      glasses = Math.max(0, parseInt(amount) || 0);
      ml = glasses * 250;
    }

    day.water = Math.min(24, glasses);
    day.waterMl = ml;
    this.saveDayLog(dateStr, day);
    return { glasses: day.water, ml: day.waterMl };
  }

  /**
   * Update calories burned
   */
  updateBurned(dateStr, burnedKcal) {
    const day = this.getDayLog(dateStr);
    day.burned = (day.burned || 0) + parseInt(burnedKcal || 0);
    this.saveDayLog(dateStr, day);
    return day.burned;
  }

  /**
   * Update mood
   */
  updateMood(dateStr, moodObj) {
    const day = this.getDayLog(dateStr);
    day.mood = moodObj;
    this.saveDayLog(dateStr, day);
  }

  /**
   * Get list of body composition analyses
   */
  getBodyHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BODY_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Add new body analysis
   */
  addBodyAnalysis(analysis) {
    const history = this.getBodyHistory();
    if (!analysis.id) {
      analysis.id = 'body_' + Date.now();
    }
    history.unshift(analysis);
    localStorage.setItem(STORAGE_KEYS.BODY_HISTORY, JSON.stringify(history));

    // Also update current weight in profile
    if (analysis.weight) {
      const profile = this.getProfile();
      profile.currentWeight = parseFloat(analysis.weight);
      this.saveProfile(profile);
    }
    return analysis;
  }

  /**
   * Semi-Monthly (15-Day) Body Tracking Status & Diff
   */
  getSemiMonthlyStatus() {
    const history = this.getBodyHistory();
    if (!history || history.length === 0) {
      return {
        hasData: false,
        isDue: true,
        daysSinceLast: 0,
        daysRemaining: 0,
        lastCheckin: null,
        previousCheckin: null,
        diff: null,
        historyList: []
      };
    }

    const last = history[0];
    const previous = history.length > 1 ? history[1] : null;

    const lastDate = new Date(last.date);
    const now = new Date();
    const diffMs = now.getTime() - lastDate.getTime();
    const daysSinceLast = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const cycleDays = 15;
    const daysRemaining = Math.max(0, cycleDays - daysSinceLast);
    const isDue = daysSinceLast >= cycleDays;

    let diff = null;
    if (previous) {
      diff = {
        weight: Math.round(((parseFloat(last.weight) || 0) - (parseFloat(previous.weight) || 0)) * 10) / 10,
        bodyFat: Math.round(((parseFloat(last.bodyFatPercent) || 0) - (parseFloat(previous.bodyFatPercent) || 0)) * 10) / 10,
        waist: Math.round(((parseFloat(last.waist) || 0) - (parseFloat(previous.waist) || 0)) * 10) / 10,
        hip: (last.hip && previous.hip) ? Math.round((parseFloat(last.hip) - parseFloat(previous.hip)) * 10) / 10 : null,
        chest: (last.chest && previous.chest) ? Math.round((parseFloat(last.chest) - parseFloat(previous.chest)) * 10) / 10 : null
      };
    }

    const nextDueDate = new Date(lastDate.getTime() + (cycleDays * 24 * 60 * 60 * 1000));

    return {
      hasData: true,
      isDue,
      cycleDays,
      daysSinceLast,
      daysRemaining,
      nextDueDate: nextDueDate.toISOString().split('T')[0],
      lastCheckin: last,
      previousCheckin: previous,
      diff,
      historyList: history
    };
  }

  getSettings() {
    const defaultKey = '';
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) {
        return { gemini_api_key: defaultKey, gemini_model: 'gemini-3.6-flash' };
      }
      const settings = JSON.parse(data);
      return settings;
    } catch (e) {
      return { gemini_api_key: defaultKey, gemini_model: 'gemini-3.6-flash' };
    }
  }

  saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }
}

window.AppedietDB = new AppedietStorage();
window.RaheemCoachDB = window.AppedietDB;
