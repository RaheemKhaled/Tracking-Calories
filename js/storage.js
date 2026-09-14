/**
 * Appediet Local Storage & State Management
 * Persistent storage for user profile, daily logs, meals, water, body analyses, and settings.
 */

const STORAGE_KEYS = {
  PROFILE: 'appediet_profile',
  DAILY_LOGS: 'appediet_daily_logs',
  BODY_HISTORY: 'appediet_body_history',
  SETTINGS: 'appediet_settings',
  SELECTED_DATE: 'appediet_selected_date',
  USERS_DB: 'appediet_users_db',
  CURRENT_USER_ID: 'appediet_current_user_id'
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
  streak: 3,
  onboardingCompleted: false,
  macroStyle: 'high_protein'
};

class AppedietStorage {
  constructor() {
    this.init();
  }

  getKey(baseKey) {
    const userId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    if (!userId) return STORAGE_KEYS[baseKey];
    return `${STORAGE_KEYS[baseKey]}_${userId}`;
  }

  init() {
    if (!localStorage.getItem(this.getKey('PROFILE'))) {
      this.saveProfile(DEFAULT_PROFILE);
    }
    if (!localStorage.getItem(this.getKey('DAILY_LOGS'))) {
      this.saveDailyLogs({});
    }
    if (!localStorage.getItem(this.getKey('BODY_HISTORY'))) {
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
      localStorage.setItem(this.getKey('BODY_HISTORY'), JSON.stringify([initialBody]));
    }
  }

  getProfile() {
    try {
      const data = localStorage.getItem(this.getKey('PROFILE'));
      return data ? { ...DEFAULT_PROFILE, ...JSON.parse(data) } : DEFAULT_PROFILE;
    } catch (e) {
      console.error('Error reading profile:', e);
      return DEFAULT_PROFILE;
    }
  }

  saveProfile(profile) {
    localStorage.setItem(this.getKey('PROFILE'), JSON.stringify(profile));
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
    const plan = this.calculateDetailedPlan(profile);
    return {
      calorieGoal: plan.calorieGoal,
      proteinGoal: plan.proteinGoal,
      fatGoal: plan.fatGoal,
      carbGoal: plan.carbGoal
    };
  }

  /**
   * Calculate detailed Mifflin-St Jeor metabolic goals, TDEE, macros, and hydration
   */
  calculateDetailedPlan(params = {}) {
    const profile = this.getProfile();
    const w = parseFloat(params.currentWeight || params.weight || profile.currentWeight) || 75;
    const h = parseFloat(params.height || profile.height) || 175;
    const a = parseFloat(params.age || profile.age) || 25;
    const g = params.gender || profile.gender || 'male';
    const targetW = parseFloat(params.goalWeight || profile.goalWeight) || w;
    const activity = params.activityLevel || profile.activityLevel || 'moderate';
    const goal = params.goal || profile.goal || (w > targetW ? 'lose' : (w < targetW ? 'gain' : 'maintain'));
    const macroStyle = params.macroStyle || profile.macroStyle || 'high_protein';

    // 1. Mifflin-St Jeor BMR formula
    let bmr = (10 * w) + (6.25 * h) - (5 * a);
    bmr = (g === 'male') ? Math.round(bmr + 5) : Math.round(bmr - 161);

    // 2. Activity Multiplier
    const actMultipliers = {
      sedentary: 1.2,    // خامل / قليل الحركة جداً
      light: 1.375,      // نشاط خفيف (1-3 أيام أسبوعياً)
      moderate: 1.55,    // نشاط متوسط (3-5 أيام أسبوعياً)
      active: 1.725,     // نشاط عالي (6-7 أيام أسبوعياً)
      extreme: 1.9       // نشاط شاق جداً
    };
    const mult = actMultipliers[activity] || 1.4;
    const tdee = Math.round(bmr * mult);

    // 3. Calorie Goal
    let calorieGoal;
    let deficitOrSurplusLabel = '';
    const minSafe = (g === 'female') ? 1200 : 1500;

    if (goal === 'lose') {
      calorieGoal = Math.max(minSafe, Math.round(tdee - 500));
      deficitOrSurplusLabel = 'عجز صحي 500 سعرة حرارية للتخلص من الدهون';
    } else if (goal === 'gain') {
      calorieGoal = Math.round(tdee + 350);
      deficitOrSurplusLabel = 'فائض محسوب 350 سعرة لبناء كتلة عضلية نقية';
    } else {
      calorieGoal = tdee;
      deficitOrSurplusLabel = 'سعرات الثبات الكاملة للحفاظ على الوزن';
    }

    // 4. Macro Splits
    let proteinG, fatG, carbG;
    if (macroStyle === 'high_protein') {
      // 2.0g per kg of body weight (ideal for athletes & fat loss retention)
      proteinG = Math.round(w * 2.0);
      // Fat: 25% of calories
      fatG = Math.round((calorieGoal * 0.25) / 9);
      // Carbs: remainder
      const remKcal = Math.max(0, calorieGoal - (proteinG * 4) - (fatG * 9));
      carbG = Math.round(remKcal / 4);
    } else if (macroStyle === 'low_carb') {
      // 25% protein, 10% carb, 65% fat
      proteinG = Math.round((calorieGoal * 0.25) / 4);
      carbG = Math.round((calorieGoal * 0.10) / 4);
      fatG = Math.round((calorieGoal * 0.65) / 9);
    } else {
      // Balanced: 30% protein, 40% carbs, 30% fat
      proteinG = Math.round((calorieGoal * 0.30) / 4);
      carbG = Math.round((calorieGoal * 0.40) / 4);
      fatG = Math.round((calorieGoal * 0.30) / 9);
    }

    // Floor bounds
    proteinG = Math.max(50, proteinG);
    carbG = Math.max(30, carbG);
    fatG = Math.max(30, fatG);

    // Water: ~35ml per kg body weight
    const waterMl = Math.round(w * 35);
    const waterCups = Math.round(waterMl / 250);

    return {
      w,
      h,
      a,
      g,
      targetW,
      activity,
      goal,
      macroStyle,
      bmr,
      tdee,
      calorieGoal,
      deficitOrSurplusLabel,
      proteinGoal: proteinG,
      proteinKcal: proteinG * 4,
      proteinPct: Math.round(((proteinG * 4) / calorieGoal) * 100),
      carbGoal: carbG,
      carbKcal: carbG * 4,
      carbPct: Math.round(((carbG * 4) / calorieGoal) * 100),
      fatGoal: fatG,
      fatKcal: fatG * 9,
      fatPct: Math.round(((fatG * 9) / calorieGoal) * 100),
      waterMl,
      waterCups
    };
  }

  getDailyLogs() {
    try {
      const data = localStorage.getItem(this.getKey('DAILY_LOGS'));
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  saveDailyLogs(logs) {
    localStorage.setItem(this.getKey('DAILY_LOGS'), JSON.stringify(logs));
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
        waterMl: 0,
        burned: 0,
        steps: 0,
        stepGoal: 10000,
        workouts: [],
        mood: null,
        meals: []
      };
    }
    const day = logs[dateStr];
    if (day.steps === undefined) day.steps = 0;
    if (day.stepGoal === undefined) day.stepGoal = 10000;
    if (!day.workouts) day.workouts = [];
    return day;
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
   * Calculate calories burned from walking steps based on user weight and height
   */
  calculateStepsCalories(steps, weight, height) {
    const profile = this.getProfile();
    const w = weight || profile.currentWeight || 95;
    const h = height || profile.height || 180;
    // Stride length estimated as height * 0.414 in cm -> meters
    const strideMeters = (h * 0.414) / 100;
    const distanceKm = (steps * strideMeters) / 1000;
    // Calorie expenditure: ~ 0.75 kcal per kg per km
    return Math.round(distanceKm * w * 0.75);
  }

  /**
   * Recalculate total burned calories for the day (steps calories + workouts calories + manual adjustments)
   */
  recalculateDayBurned(day) {
    const stepsBurned = this.calculateStepsCalories(day.steps || 0);
    let workoutsBurned = 0;
    (day.workouts || []).forEach(w => {
      workoutsBurned += (w.burnedKcal || 0);
    });
    day.stepsBurned = stepsBurned;
    day.workoutsBurned = workoutsBurned;
    day.burned = stepsBurned + workoutsBurned + (day.manualBurned || 0);
    return day.burned;
  }

  /**
   * Update daily steps count and recalculate burned calories
   */
  updateSteps(dateStr, stepsCount, goal) {
    const day = this.getDayLog(dateStr);
    day.steps = Math.max(0, parseInt(stepsCount) || 0);
    if (goal) day.stepGoal = parseInt(goal);
    this.recalculateDayBurned(day);
    this.saveDayLog(dateStr, day);
    return {
      steps: day.steps,
      stepGoal: day.stepGoal || 10000,
      stepsBurned: day.stepsBurned,
      totalBurned: day.burned
    };
  }

  /**
   * Add a workout / exercise session with diet & goal impact
   */
  addWorkout(dateStr, workout) {
    const day = this.getDayLog(dateStr);
    if (!day.workouts) day.workouts = [];
    workout.id = 'wk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    workout.loggedAt = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    day.workouts.push(workout);
    this.recalculateDayBurned(day);
    this.saveDayLog(dateStr, day);
    return workout;
  }

  /**
   * Delete a workout session
   */
  deleteWorkout(dateStr, workoutId) {
    const day = this.getDayLog(dateStr);
    if (day.workouts) {
      day.workouts = day.workouts.filter(w => w.id !== workoutId);
      this.recalculateDayBurned(day);
      this.saveDayLog(dateStr, day);
    }
    return day.workouts;
  }

  /**
   * Update manual calories burned
   */
  updateBurned(dateStr, burnedKcal) {
    const day = this.getDayLog(dateStr);
    day.manualBurned = (day.manualBurned || 0) + parseInt(burnedKcal || 0);
    this.recalculateDayBurned(day);
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
      const data = localStorage.getItem(this.getKey('BODY_HISTORY'));
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
    localStorage.setItem(this.getKey('BODY_HISTORY'), JSON.stringify(history));

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
      const data = localStorage.getItem(this.getKey('SETTINGS'));
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
    localStorage.setItem(this.getKey('SETTINGS'), JSON.stringify(settings));
  }
}

window.AppedietDB = new AppedietStorage();
window.RaheemCoachDB = window.AppedietDB;
