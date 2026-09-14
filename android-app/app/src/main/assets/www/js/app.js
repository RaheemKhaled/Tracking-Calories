/**
 * Appediet Main Application Controller
 * Orchestrates views, state synchronization, navigation tabs, and dialog interactions.
 */

class AppedietApp {
  constructor() {
    this.currentView = 'tracker';
    this.selectedDate = this.getTodayDateString();
    this.deferredInstallPrompt = null;
    this.selectedExerciseType = 'pushups';
    this.currentExerciseTab = 'exercise';
    this.currentCalculatedWorkout = null;

    this.init();
  }

  getTodayDateString() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  getSelectedDate() {
    return this.selectedDate;
  }

  init() {
    // Initialize Dual Theme
    this.initTheme();

    // Initialize components
    this.googleAuth = new window.GoogleAuthManager();
    this.scanner = new window.NutritionScanner();
    this.bodyAnalyzer = new window.BodyAnalyzer();
    this.coach = new window.HungerCoach();

    this.initCalendar();
    this.bindNavigation();
    this.bindDashboardEvents();
    this.bindPwaInstall();
    this.initAutoStepTracking();
    this.refreshDashboard();

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.log('SW registration note:', err);
      });
    }

    // Auto launch Onboarding Wizard if not completed yet
    setTimeout(() => {
      const prof = window.AppedietDB.getProfile();
      if (!prof.onboardingCompleted && window.OnboardingWizard) {
        window.OnboardingWizard.open();
      }
    }, 600);
  }

  /* ==========================================================================
     Theme Manager (Light Vitality ☀️ / Dark Obsidian 🌙)
     ========================================================================== */
  initTheme() {
    const savedTheme = localStorage.getItem('raheem_theme') || 'light';
    this.applyTheme(savedTheme);
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(nextTheme);
    this.showToast(nextTheme === 'dark' ? 'تم تفعيل المظهر الليلي 🌙' : 'تم تفعيل المظهر النهاري الإشراقي ☀️');
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('raheem_theme', theme);
    const iconEl = document.getElementById('theme-toggle-icon');
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');

    if (theme === 'dark') {
      if (iconEl) iconEl.textContent = '☀️';
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#090d16');
    } else {
      if (iconEl) iconEl.textContent = '🌙';
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#f6f9fc');
    }
  }

  /* ==========================================================================
     Calendar Strip & Date Switcher (Screenshot 4)
     ========================================================================== */
  initCalendar() {
    const calendarContainer = document.getElementById('calendar-strip-container');
    if (!calendarContainer) return;

    calendarContainer.innerHTML = '';
    const daysOfWeek = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    const today = new Date();

    // Generate current week (-3 days to +3 days)
    for (let i = -3; i <= 3; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);

      const dayName = daysOfWeek[d.getDay()];
      const dayNum = d.getDate();
      const dateStr = d.toISOString().split('T')[0];
      const isSelected = dateStr === this.selectedDate;

      const dayEl = document.createElement('div');
      dayEl.className = `cal-day-item ${isSelected ? 'active' : ''}`;
      dayEl.dataset.date = dateStr;
      dayEl.innerHTML = `
        <span class="cal-day-name">${dayName}</span>
        <span class="cal-day-number">${dayNum}</span>
      `;

      dayEl.addEventListener('click', () => {
        document.querySelectorAll('.cal-day-item').forEach(el => el.classList.remove('active'));
        dayEl.classList.add('active');
        this.selectedDate = dateStr;
        this.refreshDashboard();
      });

      calendarContainer.appendChild(dayEl);
    }
  }

  /* ==========================================================================
     Bottom Navigation & View Switching
     ========================================================================== */
  bindNavigation() {
    document.querySelectorAll('.nav-tab-item').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const view = tab.dataset.view;
        if (!view) return;

        document.querySelectorAll('.nav-tab-item').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.switchView(view);
      });
    });

    // Center Elevated Camera FAB
    document.getElementById('nav-fab-camera')?.addEventListener('click', () => {
      this.openCaptureActionSheet();
    });
  }

  switchView(viewName) {
    this.currentView = viewName;
    const views = ['tracker', 'recipes', 'body-progress', 'friends'];
    views.forEach(v => {
      const el = document.getElementById(`view-${v}`);
      if (el) {
        if (v === viewName) {
          el.classList.remove('hidden');
        } else {
          el.classList.add('hidden');
        }
      }
    });

    if (viewName === 'body-progress') {
      this.bodyAnalyzer.loadInitialData();
    }
  }

  openCaptureActionSheet() {
    const choice = confirm("اختر نوع الفحص:\n- اضغط [موافق / OK] لتصوير وجبة أو مشروب (Food Scanner) 📸\n- اضغط [إلغاء / Cancel] لتحليل صور ومقاسات الجسم (Body Fat) 🧬");
    if (choice) {
      this.scanner.openWithCapture('Lunch');
    } else {
      this.switchView('body-progress');
      document.querySelector('[data-view="body-progress"]')?.classList.add('active');
      document.querySelector('[data-view="tracker"]')?.classList.remove('active');
    }
  }

  /* ==========================================================================
     Dashboard Updates (Budget Radial, Eaten, Water, Weight, Mood)
     ========================================================================== */
  refreshDashboard() {
    const profile = window.AppedietDB.getProfile();
    const dayData = window.AppedietDB.getDayLog(this.selectedDate);

    // 0. Update Hero Vitality Banner & Dynamic Time-Based Greeting
    const hour = new Date().getHours();
    let salute = 'صباح النشاط والحيوية، ☀️';
    let quote = 'يوم جديد مليء بالحيوية لتحقيق أهدافك وخسارة الوزن 🎯';
    if (hour >= 12 && hour < 17) {
      salute = 'طاب يومك يا بطل، 🌤️';
      quote = 'استمر في الحفاظ على توازن وجباتك ونشاطك الرياضي 💪';
    } else if (hour >= 17 || hour < 4) {
      salute = 'مساء الإنجاز والصحة، 🌙';
      quote = 'أمسية مريحة! تأكد من استكمال شرب الماء وخطواتك اليومية ✨';
    }

    const saluteEl = document.getElementById('hero-greeting-salute');
    if (saluteEl) saluteEl.textContent = salute;

    const nameEl = document.getElementById('hero-greeting-name');
    if (nameEl) {
      let uName = profile.name || (this.googleAuth?.currentUser?.name) || 'بطل الصحة!';
      if (uName.includes('(')) {
        uName = uName.split('(')[0].trim();
      }
      nameEl.textContent = uName;
    }

    const quoteEl = document.getElementById('hero-daily-quote');
    if (quoteEl) quoteEl.textContent = quote;

    const streakTextEl = document.getElementById('hero-streak-text');
    if (streakTextEl) streakTextEl.innerHTML = `أيام الالتزام: <strong>${profile.streak || 0}</strong>`;

    const goalTextEl = document.getElementById('hero-goal-text');
    if (goalTextEl) {
      const goalStr = profile.goal === 'lose' ? 'خسارة وزن صحية 📉' : (profile.goal === 'gain' ? 'زيادة كتلة عضلية 🏋️' : 'تثبيت وزن ولياقة 🌟');
      goalTextEl.textContent = `الهدف: ${goalStr}`;
    }

    // Hero Avatar Update
    const heroAvatarImg = document.getElementById('hero-user-avatar');
    const heroAvatarPlaceholder = document.getElementById('hero-user-avatar-placeholder');
    const userPhoto = profile.picture || this.googleAuth?.currentUser?.picture;
    if (userPhoto && heroAvatarImg && heroAvatarPlaceholder) {
      heroAvatarImg.src = userPhoto;
      heroAvatarImg.classList.remove('hidden');
      heroAvatarPlaceholder.classList.add('hidden');
    } else if (heroAvatarImg && heroAvatarPlaceholder) {
      heroAvatarImg.classList.add('hidden');
      heroAvatarPlaceholder.classList.remove('hidden');
    }

    // Calculate totals
    let eatenKcal = 0;
    let eatenCarb = 0;
    let eatenProtein = 0;
    let eatenFat = 0;

    (dayData.meals || []).forEach(m => {
      eatenKcal += m.calories || 0;
      eatenCarb += m.carb || 0;
      eatenProtein += m.protein || 0;
      eatenFat += m.fat || 0;
    });

    const burnedKcal = dayData.burned || 0;
    const goalKcal = profile.calorieGoal || 1400;
    // Burned calories are tracked as deficit/activity and strictly NOT added back to food budget
    const remainingKcal = Math.max(0, goalKcal - eatenKcal);

    // 1. Budget Card Updates
    document.getElementById('dash-remaining-kcal').textContent = remainingKcal;
    document.getElementById('dash-goal-kcal-badge').textContent = `الهدف: ${goalKcal} سعرة 🎯`;
    document.getElementById('dash-eaten-kcal').textContent = `${eatenKcal} kcal`;
    document.getElementById('dash-burned-kcal').textContent = `${burnedKcal} kcal`;

    // Radial Progress Arc
    const progressPct = Math.min(1, eatenKcal / goalKcal);
    const arcLength = 298; // Circumference of semicircle r=95 (pi * 95 = 298.45)
    const offset = arcLength - (arcLength * progressPct);
    const arcEl = document.getElementById('dash-radial-arc');
    if (arcEl) arcEl.style.strokeDashoffset = offset;

    // Macro Bars
    const carbTarget = profile.carbGoal || 140;
    const proteinTarget = profile.proteinGoal || 88;
    const fatTarget = profile.fatGoal || 54;

    document.getElementById('dash-carb-val').textContent = `${Math.round(eatenCarb)} / ${carbTarget} g`;
    document.getElementById('dash-carb-fill').style.width = `${Math.min(100, (eatenCarb / carbTarget) * 100)}%`;

    document.getElementById('dash-protein-val').textContent = `${Math.round(eatenProtein)} / ${proteinTarget} g`;
    document.getElementById('dash-protein-fill').style.width = `${Math.min(100, (eatenProtein / proteinTarget) * 100)}%`;

    document.getElementById('dash-fat-val').textContent = `${Math.round(eatenFat)} / ${fatTarget} g`;
    document.getElementById('dash-fat-fill').style.width = `${Math.min(100, (eatenFat / fatTarget) * 100)}%`;

    // 2. Eaten Card Meals Status & Meals List
    const mealsLogged = dayData.meals || [];
    const hasBreakfast = mealsLogged.some(m => m.mealType === 'Breakfast');
    const hasLunch = mealsLogged.some(m => m.mealType === 'Lunch');
    const hasDinner = mealsLogged.some(m => m.mealType === 'Dinner');

    document.getElementById('meal-status-breakfast')?.classList.toggle('logged', hasBreakfast);
    document.getElementById('meal-status-lunch')?.classList.toggle('logged', hasLunch);
    document.getElementById('meal-status-dinner')?.classList.toggle('logged', hasDinner);

    const loggedCount = (hasBreakfast?1:0) + (hasLunch?1:0) + (hasDinner?1:0);
    const needed = Math.max(0, 3 - loggedCount);
    const descEl = document.getElementById('dash-eaten-meals-desc');
    if (descEl) descEl.textContent = needed > 0 ? `${needed} meals to complete today's log` : 'All 3 meals completed today! 🎉';

    // Populate #dash-logged-meals-list with click-to-edit support
    const mealsListContainer = document.getElementById('dash-logged-meals-list');
    if (mealsListContainer) {
      if (mealsLogged.length === 0) {
        mealsListContainer.innerHTML = `
          <div style="text-align:center; padding:12px; color:var(--text-muted); font-size:12px; background:var(--bg-chip); border-radius:12px; border:1px dashed var(--border-subtle);">
            <span>🍽️ لا توجد وجبات مسجلة لهذا اليوم بعد</span>
          </div>
        `;
      } else {
        const mealIcons = { Breakfast: '☕', Lunch: '🍲', Dinner: '🔔', Snack: '🥪' };
        mealsListContainer.innerHTML = mealsLogged.map(m => {
          const icon = mealIcons[m.mealType] || '🍴';
          const imgHtml = m.imageUrl 
            ? `<img src="${m.imageUrl}" style="width:42px; height:42px; border-radius:12px; object-fit:cover; border:1px solid var(--border-subtle);" alt="${m.name}">`
            : `<div style="width:42px; height:42px; border-radius:12px; background:var(--bg-chip); border:1px solid var(--border-subtle); display:flex; align-items:center; justify-content:center; font-size:20px;">${icon}</div>`;

          return `
            <div class="logged-meal-item-card" data-meal-id="${m.id}">
              <div style="display:flex; align-items:center; gap:10px;">
                ${imgHtml}
                <div>
                  <div style="font-weight:700; font-size:13px; color:var(--text-primary); display:flex; align-items:center; gap:6px;">
                    <span>${m.name}</span>
                    <span style="font-size:10px; background:var(--primary-blue-soft); color:var(--primary-blue); padding:2px 8px; border-radius:6px; font-weight:700;">${m.mealType}</span>
                  </div>
                  <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">
                    <strong style="color:var(--calorie-flame);">${m.calories} kcal</strong> • P: ${m.protein}g | C: ${m.carb}g | F: ${m.fat}g
                  </div>
                </div>
              </div>
              <button class="btn-edit-meal-badge" style="background:var(--bg-chip); color:var(--primary-blue); border:1px solid var(--border-subtle); border-radius:8px; padding:5px 10px; font-size:11px; font-weight:700; cursor:pointer;">
                تعديل ✏️
              </button>
            </div>
          `;
        }).join('');

        // Bind click on each meal card to open in editor
        mealsListContainer.querySelectorAll('.logged-meal-item-card').forEach(el => {
          el.addEventListener('click', () => {
            const mealId = el.dataset.mealId;
            const meal = mealsLogged.find(m => m.id === mealId);
            if (meal) {
              this.scanner.openForEdit(meal, this.selectedDate);
            }
          });
        });
      }
    }

    // 3. Water Card Updates
    const currentWater = dayData.water || 0; // glasses count
    const waterMl = dayData.waterMl || (currentWater * 250);
    const intakeValEl = document.getElementById('dash-water-intake-val');
    if (intakeValEl) {
      intakeValEl.textContent = `${waterMl} مل (${currentWater} كوب)`;
    }
    document.getElementById('dash-water-goal-val').textContent = `Goal: ${profile.waterGoal || 64} fl oz (حوالي 2000 مل)`;

    // Update 4:00 AM - 12:00 AM Cutoff Notice
    const windowInfo = window.AppedietDB.getWaterWindowInfo();
    const windowBadge = document.getElementById('dash-water-window-badge');
    if (windowBadge) {
      windowBadge.textContent = windowInfo.statusText;
    }

    const cups = document.querySelectorAll('.water-cup-item');
    cups.forEach((c, idx) => {
      c.classList.toggle('filled', idx < currentWater);
    });

    // 4. Weight Card Updates
    const curW = profile.currentWeight || 95;
    const goalW = profile.goalWeight || 80;
    const toLose = Math.max(0, Math.round((curW - goalW) * 10) / 10);
    const hM = (profile.height || 180) / 100;
    const bmi = Math.round((curW / (hM * hM)) * 10) / 10;

    document.getElementById('dash-current-weight-val').textContent = curW;
    document.getElementById('dash-weight-bmi').textContent = `BMI: ${bmi}`;
    document.getElementById('dash-goal-weight-val').textContent = `Goal Weight: ${goalW} kg`;
    document.getElementById('dash-weight-to-lose-val').textContent = `Weight to Lose: ${toLose} kg`;

    // 5. Streak & Crown
    document.getElementById('dash-streak-count').textContent = profile.streak || 0;

    // 6. Burned Card & Daily Steps Updates
    const burnedTotalEl = document.getElementById('dash-calories-burned-val');
    if (burnedTotalEl) {
      burnedTotalEl.textContent = `${burnedKcal} kcal`;
    }

    const steps = dayData.steps || 0;
    const stepGoal = dayData.stepGoal || 10000;
    const heightCm = profile.height || 180;
    const stepsBurned = window.AppedietDB.calculateStepsCalories(steps, curW, heightCm);
    const strideM = (heightCm * 0.414) / 100;
    const stepsDistance = Math.round(((steps * strideM) / 1000) * 100) / 100;
    const stepsPct = Math.min(100, Math.round((steps / stepGoal) * 100));

    const stepsDetailsEl = document.getElementById('dash-steps-details');
    if (stepsDetailsEl) stepsDetailsEl.textContent = `${steps.toLocaleString()} / ${stepGoal.toLocaleString()} خطوة`;
    
    const stepsKcalEl = document.getElementById('dash-steps-kcal');
    if (stepsKcalEl) stepsKcalEl.textContent = `🔥 ${stepsBurned} kcal`;

    const stepsDistEl = document.getElementById('dash-steps-distance');
    if (stepsDistEl) stepsDistEl.textContent = `${stepsDistance} كم`;

    const stepsBarEl = document.getElementById('dash-steps-progress-bar');
    if (stepsBarEl) stepsBarEl.style.width = `${stepsPct}%`;

    // Render Logged Workouts
    const workouts = dayData.workouts || [];
    const workoutsCountEl = document.getElementById('dash-workouts-count');
    if (workoutsCountEl) workoutsCountEl.textContent = `${workouts.length} تمارين`;

    const workoutsListContainer = document.getElementById('dash-logged-workouts-list');
    if (workoutsListContainer) {
      if (workouts.length === 0) {
        workoutsListContainer.innerHTML = `
          <div style="text-align:center; padding:10px; color:var(--text-muted); font-size:11.5px; background:var(--bg-chip); border-radius:10px; border:1px dashed var(--border-subtle);">
            <span>🏋️ لا توجد تمارين مسجلة لهذا اليوم بعد - اضغط للبدء</span>
          </div>
        `;
      } else {
        workoutsListContainer.innerHTML = workouts.map(w => {
          const qtyText = w.isRepBased ? `${w.reps} تكرار` : `${w.minutes} دقيقة`;
          return `
            <div class="workout-item-card" data-workout-id="${w.id}">
              <div style="display:flex; align-items:center; gap:10px;">
                <div style="width:38px; height:38px; border-radius:10px; background:var(--bg-chip); border:1px solid var(--border-subtle); display:flex; align-items:center; justify-content:center; font-size:18px;">
                  ${w.icon || '🏋️'}
                </div>
                <div>
                  <div style="font-weight:700; font-size:12.5px; color:var(--text-primary); display:flex; align-items:center; gap:6px;">
                    <span>${w.name}</span>
                    <span style="font-size:10px; background:var(--primary-blue-soft); color:var(--primary-blue); padding:1px 6px; border-radius:6px; font-weight:700;">${qtyText}</span>
                  </div>
                  <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">
                    <strong style="color:var(--calorie-flame);">🔥 ${w.burnedKcal} kcal</strong> • <span style="color:var(--primary-blue);">${w.targetMuscles || 'عضلات متعددة'}</span>
                  </div>
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:6px;">
                <button class="workout-impact-badge-btn" data-workout-id="${w.id}" title="عرض أثر التمرين على الدايت">
                  <span>أثر التمرين 💡</span>
                </button>
                <button class="btn-delete-workout" data-workout-id="${w.id}" style="background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.25); color:#ef4444; border-radius:8px; width:28px; height:28px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:12px;" title="حذف التمرين">
                  🗑️
                </button>
              </div>
            </div>
          `;
        }).join('');

        // Bind View Impact
        workoutsListContainer.querySelectorAll('.workout-impact-badge-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const wId = btn.dataset.workoutId;
            const w = workouts.find(item => item.id === wId);
            if (w) this.openWorkoutDetailModal(w);
          });
        });

        // Bind Delete Workout
        workoutsListContainer.querySelectorAll('.btn-delete-workout').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const wId = btn.dataset.workoutId;
            if (confirm('هل تريد حذف هذا التمرين المسجل؟')) {
              window.AppedietDB.deleteWorkout(this.selectedDate, wId);
              const updatedDay = window.AppedietDB.getDayLog(this.selectedDate);
              window.GoogleWorkspaceSync?.syncBurned?.(this.selectedDate, updatedDay.burned || 0);
              this.showToast('تم حذف التمرين بنجاح 🗑️');
              this.refreshDashboard();
            }
          });
        });
      }
    }
  }

  /* ==========================================================================
     Dashboard Interactive Clicks (Water, Weight Update, Workout, Mood, Settings)
     ========================================================================== */
  bindDashboardEvents() {
    // Theme Switcher Toggle
    document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
      this.toggleTheme();
    });
    // Eaten Card "Log Now" button -> Trigger Food Camera / Scan
    document.getElementById('btn-eaten-log-now')?.addEventListener('click', () => {
      this.scanner.openWithCapture('Breakfast');
    });

    // Weekly Health Report button and link
    document.getElementById('btn-open-weekly-report')?.addEventListener('click', () => {
      this.openWeeklyReportModal();
    });
    document.getElementById('eaten-health-report-link')?.addEventListener('click', () => {
      this.openWeeklyReportModal();
    });

    // Water modal buttons
    document.getElementById('btn-open-water-modal')?.addEventListener('click', () => {
      this.openWaterAdjustModal();
    });
    document.getElementById('link-more-water')?.addEventListener('click', () => {
      this.openWaterAdjustModal();
    });

    // Water cups click
    document.querySelectorAll('.water-cup-item').forEach((cup, idx) => {
      cup.addEventListener('click', () => {
        const dayData = window.AppedietDB.getDayLog(this.selectedDate);
        let newGlasses = idx + 1;
        // If already clicked this cup, allow deselecting
        if (dayData.water === idx + 1) {
          newGlasses = idx;
        }
        window.AppedietDB.updateWater(this.selectedDate, newGlasses, 'glasses');
        window.GoogleWorkspaceSync?.syncWater(this.selectedDate, newGlasses, dayData.burned || 0);
        this.refreshDashboard();
      });
    });

    // Add Workout / Steps buttons
    document.getElementById('btn-add-workout')?.addEventListener('click', () => {
      this.openExerciseLoggerModal('exercise');
    });
    document.getElementById('link-more-burned')?.addEventListener('click', () => {
      this.openExerciseLoggerModal('exercise');
    });
    document.getElementById('btn-open-steps-calculator')?.addEventListener('click', () => {
      this.openExerciseLoggerModal('steps');
    });

    // Quick Step Buttons on Dashboard
    document.getElementById('btn-quick-step-500')?.addEventListener('click', () => {
      this.quickAddSteps(500);
    });
    document.getElementById('btn-quick-step-1000')?.addEventListener('click', () => {
      this.quickAddSteps(1000);
    });
    document.getElementById('btn-quick-step-2000')?.addEventListener('click', () => {
      this.quickAddSteps(2000);
    });

    // Initialize Exercise Logger Modal Handlers
    this.initExerciseLoggerModal();

    // Update Weight button
    document.getElementById('btn-update-weight-modal')?.addEventListener('click', () => {
      this.openWeightModal();
    });

    // Log Mood Feeling button
    document.getElementById('btn-log-feeling-modal')?.addEventListener('click', () => {
      this.openMoodModal();
    });

    // Goal Pill & Hero Goal Badge click -> Open Onboarding & Macro Wizard
    document.getElementById('dash-goal-kcal-badge')?.addEventListener('click', () => {
      this.openWeightModal();
    });
    document.getElementById('hero-badge-target')?.addEventListener('click', () => {
      this.openWeightModal();
    });

    // Crown VIP / Settings click
    document.getElementById('badge-crown-vip')?.addEventListener('click', () => {
      this.openSettingsModal();
    });
  }

  /* ==========================================================================
     Modal Dialogs Handlers
     ========================================================================== */
  openWeightModal() {
    if (window.OnboardingWizard) {
      window.OnboardingWizard.open();
    } else {
      const profile = window.AppedietDB.getProfile();
      const newWeight = prompt('تحديث وزنك الحالي (كجم):', profile.currentWeight);
      if (newWeight && !isNaN(newWeight)) {
        profile.currentWeight = parseFloat(newWeight);
        const newGoals = window.AppedietDB.calculateGoals(profile);
        profile.calorieGoal = newGoals.calorieGoal;
        profile.proteinGoal = newGoals.proteinGoal;
        profile.fatGoal = newGoals.fatGoal;
        profile.carbGoal = newGoals.carbGoal;
        window.AppedietDB.saveProfile(profile);
        this.showToast(`تم تحديث الوزن (${profile.currentWeight} كجم) وحساب الميزانية بنجاح! ⚖️`);
        this.refreshDashboard();
      }
    }
  }

  openMoodModal() {
    const moods = ['😊 متحمس وملتزم', '😌 هادئ ومرتاح', '🥱 مرهق قليلاً', '🍕 مشتهي وجبة مفضلة'];
    const choice = prompt(`كيف تشعر الآن؟\n1. ${moods[0]}\n2. ${moods[1]}\n3. ${moods[2]}\n4. ${moods[3]}\nأدخل الرقم (1-4):`, '1');
    if (choice && choice >= 1 && choice <= 4) {
      const selectedMood = moods[parseInt(choice) - 1];
      window.AppedietDB.updateMood(this.selectedDate, { label: selectedMood, time: new Date().toLocaleTimeString() });
      this.showToast(`تم تسجيل شعورك: ${selectedMood} ✨`);
    }
  }

  openSettingsModal() {
    const modal = document.getElementById('settings-sync-modal');
    if (!modal) return;

    // Load current values
    const settings = window.AppedietDB.getSettings();
    const apiKeyInput = document.getElementById('settings-api-key-input');
    if (apiKeyInput && settings.gemini_api_key) {
      apiKeyInput.value = settings.gemini_api_key;
    }

    const webhookInput = document.getElementById('google-webhook-url-input');
    const statusBadge = document.getElementById('google-sync-status-badge');
    if (webhookInput && window.GoogleWorkspaceSync) {
      webhookInput.value = window.GoogleWorkspaceSync.getWebhookUrl();
      if (window.GoogleWorkspaceSync.isConfigured()) {
        if (statusBadge) {
          statusBadge.textContent = 'متصل سحابياً 🟢';
          statusBadge.style.background = 'rgba(16, 185, 129, 0.2)';
          statusBadge.style.color = '#34d399';
        }
      } else {
        if (statusBadge) {
          statusBadge.textContent = 'غير متصل ⚪';
          statusBadge.style.background = 'rgba(239, 68, 68, 0.2)';
          statusBadge.style.color = '#fca5a5';
        }
      }
    }

    modal.classList.add('active');

    // Bind Close
    document.getElementById('btn-close-settings-modal')?.addEventListener('click', () => {
      modal.classList.remove('active');
    }, { once: true });

    // Bind API Key Save
    document.getElementById('btn-save-api-key')?.addEventListener('click', () => {
      const val = apiKeyInput ? apiKeyInput.value.trim() : '';
      settings.gemini_api_key = val;
      window.AppedietDB.saveSettings(settings);
      this.showToast('تم حفظ مفتاح Gemini API بنجاح! 🔑');
    });

    // Bind Google Webhook Save
    document.getElementById('btn-save-google-webhook')?.addEventListener('click', () => {
      const url = webhookInput ? webhookInput.value.trim() : '';
      window.GoogleWorkspaceSync?.setWebhookUrl(url);
      if (window.GoogleWorkspaceSync?.isConfigured()) {
        if (statusBadge) {
          statusBadge.textContent = 'متصل سحابياً 🟢';
          statusBadge.style.background = 'rgba(16, 185, 129, 0.2)';
          statusBadge.style.color = '#34d399';
        }
        this.showToast('تم حفظ رابط Google Workspace وتفعيل الحفظ التلقائي! 📊');
      } else {
        this.showToast('يرجى إدخال رابط Apps Script يبدأ بـ https://script.google.com');
      }
    });

    // Bind Test Sync
    document.getElementById('btn-test-google-sync')?.addEventListener('click', async () => {
      this.showToast('جاري تجربة إرسال نسخة للشيت... ⏳');
      const res = await window.GoogleWorkspaceSync?.backupAllData();
      if (res && res.success) {
        this.showToast('تم الاتصال وإرسال البيانات بنجاح إلى Google Sheets! 🎉');
      } else {
        this.showToast('تأكد من نشر Web App بصلاحية "Anyone" وحفظ الرابط.');
      }
    });
  }

  /* ==========================================================================
     Weekly Health Report Modal
     ========================================================================== */
  openWeeklyReportModal() {
    const modal = document.getElementById('weekly-report-modal');
    if (!modal) return;

    const report = window.WeeklyReportEngine.generateReportData(this.selectedDate);

    // Set dates range
    const rangeEl = document.getElementById('weekly-report-dates-range');
    if (rangeEl) {
      rangeEl.textContent = `تحليل الالتزام من ${report.startDate} إلى ${report.endDate}`;
    }

    // Set score
    const scoreVal = document.getElementById('report-score-val');
    const scoreBadge = document.getElementById('report-score-badge');
    const scoreRating = document.getElementById('report-score-rating');
    if (scoreVal) scoreVal.textContent = report.score;
    if (scoreBadge) scoreBadge.textContent = report.scoreBadge;
    if (scoreRating) scoreRating.textContent = report.scoreRating;

    // Set healthy vs junk counts
    const healthyCountEl = document.getElementById('report-healthy-count');
    const junkCountEl = document.getElementById('report-junk-count');
    if (healthyCountEl) healthyCountEl.textContent = report.healthyMealsCount;
    if (junkCountEl) junkCountEl.textContent = report.junkMealsCount;

    // Render 7-day grid
    const daysGrid = document.getElementById('weekly-days-grid');
    if (daysGrid) {
      daysGrid.innerHTML = report.dayReports.map(d => {
        let mealsDesc = '';
        if (d.meals.length > 0) {
          const junkNames = d.meals.filter(m => m._classification?.type === 'junk').map(m => m.name);
          const healthyNames = d.meals.filter(m => m._classification?.type === 'healthy').map(m => m.name);
          
          if (junkNames.length > 0) {
            mealsDesc = `<div style="font-size:11px; color:#fca5a5; margin-top:3px;">🔴 أكل ضار: ${junkNames.join('، ')}</div>`;
          } else if (healthyNames.length > 0) {
            mealsDesc = `<div style="font-size:11px; color:#6ee7b7; margin-top:3px;">🟢 أكل صحي: ${healthyNames.join('، ')}</div>`;
          }
        }

        return `
          <div style="background:#131824; border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:8px 10px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <strong style="color:#f1f5f9; font-size:12.5px;">${d.dayName}</strong>
                <span style="font-size:11px; color:#64748b; margin-right:4px;">(${d.date.split('-').slice(1).join('/')})</span>
              </div>
              <span style="font-size:11px; font-weight:700; color:${d.gradeColor};">${d.gradeLabel}</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:11px; color:#94a3b8; margin-top:4px;">
              <span>السعرات: <strong style="color:#fff;">${d.calories}</strong> / ${d.goal} kcal</span>
              <span>الماء: <strong style="color:#38bdf8;">${d.water}</strong> أكواب</span>
              <span>الوجبات: <strong style="color:#fff;">${d.mealsCount}</strong></span>
            </div>
            ${mealsDesc}
          </div>
        `;
      }).join('');
    }

    // Set AI narrative loading
    const aiContentEl = document.getElementById('report-ai-content');
    if (aiContentEl) {
      aiContentEl.innerHTML = `جاري استدعاء كوتش رحيم لتحليل التقرير وكتابة التوجيهات... ⏳`;
    }

    modal.classList.add('active');

    // Generate AI Narrative
    window.WeeklyReportEngine.generateAiNarrative(report).then(narrative => {
      if (aiContentEl) {
        // Simple markdown parsing to clean HTML
        const formatted = narrative
          .replace(/### (.*?)\n/g, '<h4 style="color:#60a5fa; font-size:13px; margin:10px 0 4px 0;">$1</h4>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        aiContentEl.innerHTML = formatted;
      }
    });

    // Bind Close buttons
    const closeBtn = document.getElementById('btn-close-weekly-report-modal');
    const doneBtn = document.getElementById('btn-close-weekly-report-done');
    const closeFn = () => modal.classList.remove('active');
    closeBtn?.addEventListener('click', closeFn, { once: true });
    doneBtn?.addEventListener('click', closeFn, { once: true });
  }

  /* ==========================================================================
     Water Intake Adjustment Modal (4 AM to 12 AM Cutoff)
     ========================================================================== */
  openWaterAdjustModal() {
    const modal = document.getElementById('water-adjust-modal');
    if (!modal) return;

    const dayData = window.AppedietDB.getDayLog(this.selectedDate);
    const dateDisplay = document.getElementById('water-modal-date-display');
    if (dateDisplay) {
      dateDisplay.textContent = `تاريخ: ${this.selectedDate}`;
    }

    const currentMl = dayData.waterMl || ((dayData.water || 0) * 250);
    const inputMl = document.getElementById('input-water-ml');
    const cupsCalc = document.getElementById('water-modal-cups-calc');

    const updateCalc = (val) => {
      const c = Math.round((parseInt(val) || 0) / 250);
      if (cupsCalc) {
        cupsCalc.textContent = `يساوي تقريباً ${c} كوب (250 مل لكل كوب)`;
      }
    };

    if (inputMl) {
      inputMl.value = currentMl;
      updateCalc(currentMl);
      inputMl.oninput = () => updateCalc(inputMl.value);
    }

    // Steppers +/- 250ml
    const btnMinus = document.getElementById('btn-water-minus-250');
    const btnPlus = document.getElementById('btn-water-plus-250');
    if (btnMinus && inputMl) {
      btnMinus.onclick = () => {
        inputMl.value = Math.max(0, (parseInt(inputMl.value) || 0) - 250);
        updateCalc(inputMl.value);
      };
    }
    if (btnPlus && inputMl) {
      btnPlus.onclick = () => {
        inputMl.value = Math.min(6000, (parseInt(inputMl.value) || 0) + 250);
        updateCalc(inputMl.value);
      };
    }

    // Preset buttons
    document.querySelectorAll('.water-preset-btn').forEach(btn => {
      btn.onclick = () => {
        const ml = btn.dataset.ml;
        if (inputMl && ml) {
          inputMl.value = ml;
          updateCalc(ml);
        }
      };
    });

    modal.classList.add('active');

    // Save button
    const saveBtn = document.getElementById('btn-save-custom-water');
    if (saveBtn) {
      saveBtn.onclick = () => {
        const finalMl = Math.max(0, parseInt(inputMl.value) || 0);
        const res = window.AppedietDB.updateWater(this.selectedDate, finalMl, 'ml');
        window.GoogleWorkspaceSync?.syncWater(this.selectedDate, res.glasses, dayData.burned || 0);
        this.showToast(`تم حفظ كمية الماء (${finalMl} مل / ${res.glasses} كوب) بنجاح! 💧`);
        this.refreshDashboard();
        modal.classList.remove('active');
      };
    }

    // Close button
    document.getElementById('btn-close-water-modal')?.addEventListener('click', () => {
      modal.classList.remove('active');
    }, { once: true });
  }

  /* ==========================================================================
     Automatic Hardware Step Tracking (Android 14+ StepCounterService & Web Sensors)
     ========================================================================== */
  initAutoStepTracking() {
    // 1. Global callback called by Android Kotlin evaluateJavascript
    window.onStepCountUpdate = (steps) => {
      this.handleAutoStepCount(steps);
    };

    // 2. Query initial cached steps from AndroidStepBridge if running natively
    if (window.AndroidStepBridge) {
      try {
        const todaySteps = window.AndroidStepBridge.getTodaySteps();
        if (todaySteps > 0) {
          this.handleAutoStepCount(todaySteps);
        }
        const statusText = document.getElementById('steps-sensor-status-text');
        if (statusText) {
          statusText.textContent = 'متصل بحساس الهاتف العتادي (Android Health Service 🟢)';
        }
      } catch (e) {
        console.log('AndroidStepBridge init note:', e);
      }
    } else {
      // 3. Fallback for mobile web browsers: DeviceMotion Pedometer
      this.initWebPedometerFallback();
    }
  }

  initWebPedometerFallback() {
    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window && !window.AndroidStepBridge) {
      let lastStepTime = 0;
      const threshold = 12.0; // Acceleration peak threshold for walking
      window.addEventListener('devicemotion', (event) => {
        const acc = event.accelerationIncludingGravity;
        if (!acc) return;
        const mag = Math.sqrt((acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2);
        const now = Date.now();
        if (mag > threshold && (now - lastStepTime) > 350) {
          lastStepTime = now;
          const today = this.getTodayDateString();
          const curSteps = window.AppedietDB.getDayLog(today).steps || 0;
          this.handleAutoStepCount(curSteps + 1);
        }
      }, { passive: true });
    }
  }

  handleAutoStepCount(steps) {
    if (typeof steps !== 'number' || isNaN(steps) || steps < 0) return;
    const today = this.getTodayDateString();

    // Persist to local database
    const dayData = window.AppedietDB.getDayLog(today);
    window.AppedietDB.updateSteps(today, steps, dayData.stepGoal || 10000);

    // Refresh view if looking at today
    if (this.selectedDate === today) {
      this.refreshDashboard();
      const badge = document.getElementById('dash-steps-auto-badge');
      if (badge) {
        badge.textContent = 'تلقائي 📱🟢';
        badge.style.background = 'rgba(16, 185, 129, 0.2)';
        badge.style.color = '#6ee7b7';
      }
      const modalText = document.getElementById('steps-sensor-status-text');
      if (modalText) {
        modalText.textContent = `حساس الهاتف يسجل الخطوات آلياً: ${steps.toLocaleString()} خطوة 👟`;
      }
    }
  }

  quickAddSteps(delta) {
    const dayData = window.AppedietDB.getDayLog(this.selectedDate);
    const newSteps = (dayData.steps || 0) + delta;
    window.AppedietDB.updateSteps(this.selectedDate, newSteps, dayData.stepGoal || 10000);
    const updatedDay = window.AppedietDB.getDayLog(this.selectedDate);
    window.GoogleWorkspaceSync?.syncBurned?.(this.selectedDate, updatedDay.burned || 0);
    this.showToast(`+${delta.toLocaleString()} خطوة! إجمالي اليوم: ${newSteps.toLocaleString()} 👟`);
    this.refreshDashboard();
  }

  initExerciseLoggerModal() {
    const modal = document.getElementById('exercise-logger-modal');
    if (!modal) return;

    // Tab switching
    document.getElementById('tab-btn-exercise')?.addEventListener('click', () => {
      this.switchExerciseModalTab('exercise');
    });
    document.getElementById('tab-btn-steps')?.addEventListener('click', () => {
      this.switchExerciseModalTab('steps');
    });

    // Exercise Chips Selection
    document.querySelectorAll('.exercise-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const type = chip.dataset.type;
        this.selectExerciseChip(type);
      });
    });

    // Reps Stepper (+/-)
    document.getElementById('btn-exercise-reps-minus')?.addEventListener('click', () => {
      const input = document.getElementById('input-exercise-reps');
      if (input) {
        input.value = Math.max(5, (parseInt(input.value) || 30) - 5);
        this.updateLiveExerciseImpact();
      }
    });
    document.getElementById('btn-exercise-reps-plus')?.addEventListener('click', () => {
      const input = document.getElementById('input-exercise-reps');
      if (input) {
        input.value = (parseInt(input.value) || 30) + 5;
        this.updateLiveExerciseImpact();
      }
    });
    document.getElementById('input-exercise-reps')?.addEventListener('input', () => {
      this.updateLiveExerciseImpact();
    });
    document.querySelectorAll('.exercise-reps-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.dataset.val);
        const input = document.getElementById('input-exercise-reps');
        if (input) {
          input.value = val;
          this.updateLiveExerciseImpact();
        }
      });
    });

    // Minutes Stepper (+/-)
    document.getElementById('btn-exercise-mins-minus')?.addEventListener('click', () => {
      const input = document.getElementById('input-exercise-minutes');
      if (input) {
        input.value = Math.max(5, (parseInt(input.value) || 20) - 5);
        this.updateLiveExerciseImpact();
      }
    });
    document.getElementById('btn-exercise-mins-plus')?.addEventListener('click', () => {
      const input = document.getElementById('input-exercise-minutes');
      if (input) {
        input.value = (parseInt(input.value) || 20) + 5;
        this.updateLiveExerciseImpact();
      }
    });
    document.getElementById('input-exercise-minutes')?.addEventListener('input', () => {
      this.updateLiveExerciseImpact();
    });
    document.querySelectorAll('.exercise-mins-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.dataset.val);
        const input = document.getElementById('input-exercise-minutes');
        if (input) {
          input.value = val;
          this.updateLiveExerciseImpact();
        }
      });
    });

    // AI Analysis for Custom Exercise Button
    document.getElementById('btn-ai-analyze-custom-exercise')?.addEventListener('click', async () => {
      const descInput = document.getElementById('input-custom-exercise-desc');
      const text = descInput ? descInput.value.trim() : '';
      if (!text) {
        this.showToast('يرجى كتابة وصف للتمرين أو النشاط أولاً ✍️');
        return;
      }
      const btn = document.getElementById('btn-ai-analyze-custom-exercise');
      const origText = btn.textContent;
      btn.textContent = 'جاري تحليل كوتش رحيم بالذكاء الاصطناعي... ⏳';
      btn.disabled = true;

      try {
        const profile = window.AppedietDB.getProfile();
        const customRes = await window.ExerciseEngine.analyzeCustomExercise(text, profile.currentWeight || 95);
        this.currentCalculatedWorkout = customRes;
        this.displayCalculatedImpact(customRes);
        this.showToast('تم التحليل الذكي للتمرين بنجاح! ✨');
      } catch (err) {
        console.error('Custom exercise AI error:', err);
      } finally {
        btn.textContent = origText;
        btn.disabled = false;
      }
    });

    // Save Workout Button
    document.getElementById('btn-save-exercise-record')?.addEventListener('click', () => {
      this.saveExerciseRecord();
    });

    // Steps Modal Stepper & Presets
    document.getElementById('btn-modal-steps-minus-500')?.addEventListener('click', () => {
      const input = document.getElementById('input-modal-steps-count');
      if (input) {
        input.value = Math.max(0, (parseInt(input.value) || 0) - 500);
        this.updateLiveStepsImpact();
      }
    });
    document.getElementById('btn-modal-steps-plus-500')?.addEventListener('click', () => {
      const input = document.getElementById('input-modal-steps-count');
      if (input) {
        input.value = (parseInt(input.value) || 0) + 500;
        this.updateLiveStepsImpact();
      }
    });
    document.getElementById('input-modal-steps-count')?.addEventListener('input', () => {
      this.updateLiveStepsImpact();
    });
    document.getElementById('input-modal-steps-goal')?.addEventListener('input', () => {
      this.updateLiveStepsImpact();
    });
    document.querySelectorAll('.modal-steps-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const steps = parseInt(btn.dataset.steps);
        const input = document.getElementById('input-modal-steps-count');
        if (input) {
          input.value = steps;
          this.updateLiveStepsImpact();
        }
      });
    });

    // Save Steps Button
    document.getElementById('btn-save-steps-record')?.addEventListener('click', () => {
      this.saveStepsRecord();
    });

    // Request / Re-check Hardware Sensor Permissions
    document.getElementById('btn-request-step-sensor')?.addEventListener('click', () => {
      if (window.AndroidStepBridge) {
        window.AndroidStepBridge.requestStepPermissions();
        const steps = window.AndroidStepBridge.getTodaySteps();
        if (steps > 0) {
          this.handleAutoStepCount(steps);
        }
        this.showToast(`حساس الهاتف متصل! الخطوات المسجلة: ${steps.toLocaleString()} 📱`);
      } else {
        this.showToast('حساس الحركة بالمتصفح يعمل تلقائياً أثناء المشي 📱');
      }
    });

    // Close buttons
    document.getElementById('btn-close-exercise-modal')?.addEventListener('click', () => {
      modal.classList.remove('active');
    });

    document.getElementById('btn-close-workout-detail-modal')?.addEventListener('click', () => {
      document.getElementById('workout-impact-details-modal')?.classList.remove('active');
    });
    document.getElementById('btn-close-detail-modal-done')?.addEventListener('click', () => {
      document.getElementById('workout-impact-details-modal')?.classList.remove('active');
    });
  }

  openExerciseLoggerModal(tab = 'exercise') {
    const modal = document.getElementById('exercise-logger-modal');
    if (!modal) return;

    this.switchExerciseModalTab(tab);

    const dayData = window.AppedietDB.getDayLog(this.selectedDate);
    const stepsInput = document.getElementById('input-modal-steps-count');
    if (stepsInput) stepsInput.value = dayData.steps || 0;
    const goalInput = document.getElementById('input-modal-steps-goal');
    if (goalInput) goalInput.value = dayData.stepGoal || 10000;

    this.selectExerciseChip(this.selectedExerciseType || 'pushups');
    this.updateLiveStepsImpact();

    modal.classList.add('active');
  }

  switchExerciseModalTab(tab) {
    this.currentExerciseTab = tab;
    const isExercise = tab === 'exercise';

    document.getElementById('tab-btn-exercise')?.classList.toggle('active', isExercise);
    document.getElementById('tab-btn-steps')?.classList.toggle('active', !isExercise);

    document.getElementById('exercise-tab-content-exercise')?.classList.toggle('hidden', !isExercise);
    document.getElementById('exercise-tab-content-steps')?.classList.toggle('hidden', isExercise);

    if (!isExercise) {
      this.updateLiveStepsImpact();
    }
  }

  selectExerciseChip(type) {
    this.selectedExerciseType = type;
    document.querySelectorAll('.exercise-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.type === type);
    });

    const isCustom = type === 'custom';
    document.getElementById('exercise-custom-input-box')?.classList.toggle('hidden', !isCustom);

    const exercise = window.ExerciseEngine ? window.ExerciseEngine.getExercise(type) : null;
    const isRepBased = exercise ? exercise.isRepBased : true;

    document.getElementById('exercise-reps-container')?.classList.toggle('hidden', !isRepBased);
    document.getElementById('exercise-duration-container')?.classList.toggle('hidden', isRepBased);

    this.updateLiveExerciseImpact();
  }

  updateLiveExerciseImpact() {
    if (!window.ExerciseEngine) return;
    const profile = window.AppedietDB.getProfile();
    const weight = profile.currentWeight || 95;

    const repsInput = document.getElementById('input-exercise-reps');
    const minsInput = document.getElementById('input-exercise-minutes');

    const reps = repsInput ? (parseInt(repsInput.value) || 30) : 30;
    const minutes = minsInput ? (parseInt(minsInput.value) || 20) : 20;

    const res = window.ExerciseEngine.calculateExercise(this.selectedExerciseType, { reps, minutes }, weight);
    this.currentCalculatedWorkout = res;
    this.displayCalculatedImpact(res);
  }

  displayCalculatedImpact(res) {
    if (!res) return;
    document.getElementById('impact-exercise-title').textContent = res.name;
    document.getElementById('impact-burned-kcal').textContent = `${res.burnedKcal} kcal`;
    document.getElementById('impact-protein-needed').textContent = res.proteinNeeded;
    document.getElementById('impact-target-muscles').textContent = res.targetMuscles;
    document.getElementById('impact-fat-loss').textContent = `~${res.fatLossGrams} جم دهون صافية`;
    document.getElementById('impact-post-meal').textContent = res.postWorkoutMeal;
    document.getElementById('impact-coach-advice').textContent = res.coachAdvice;
  }

  saveExerciseRecord() {
    this.updateLiveExerciseImpact();
    if (!this.currentCalculatedWorkout) return;

    let workout = Object.assign({}, this.currentCalculatedWorkout);

    if (this.selectedExerciseType === 'custom') {
      const customDesc = document.getElementById('input-custom-exercise-desc')?.value.trim();
      if (customDesc) workout.name = customDesc;
    }

    const saved = window.AppedietDB.addWorkout(this.selectedDate, workout);
    const dayData = window.AppedietDB.getDayLog(this.selectedDate);
    window.GoogleWorkspaceSync?.syncBurned?.(this.selectedDate, dayData.burned || 0);

    this.showToast(`تم تسجيل ${workout.name} (+${workout.burnedKcal} kcal) وحساب الأثر بنجاح! 🔥`);
    document.getElementById('exercise-logger-modal')?.classList.remove('active');
    this.refreshDashboard();
  }

  updateLiveStepsImpact() {
    const profile = window.AppedietDB.getProfile();
    const weight = profile.currentWeight || 95;
    const height = profile.height || 180;

    const stepsInput = document.getElementById('input-modal-steps-count');
    const goalInput = document.getElementById('input-modal-steps-goal');

    const steps = stepsInput ? Math.max(0, parseInt(stepsInput.value) || 0) : 0;
    const goal = goalInput ? Math.max(1000, parseInt(goalInput.value) || 10000) : 10000;

    const burned = window.AppedietDB.calculateStepsCalories(steps, weight, height);
    const strideM = (height * 0.414) / 100;
    const distanceKm = Math.round(((steps * strideM) / 1000) * 100) / 100;
    const pct = Math.min(100, Math.round((steps / goal) * 100));

    document.getElementById('modal-steps-calc-kcal').textContent = `${burned} kcal`;
    document.getElementById('modal-steps-calc-dist').textContent = `${distanceKm} كم`;
    document.getElementById('modal-steps-calc-pct').textContent = `${pct}%`;
    document.getElementById('modal-steps-calc-deficit').textContent = `+${burned} kcal عجز`;
  }

  saveStepsRecord() {
    const stepsInput = document.getElementById('input-modal-steps-count');
    const goalInput = document.getElementById('input-modal-steps-goal');

    const steps = stepsInput ? Math.max(0, parseInt(stepsInput.value) || 0) : 0;
    const goal = goalInput ? Math.max(1000, parseInt(goalInput.value) || 10000) : 10000;

    window.AppedietDB.updateSteps(this.selectedDate, steps, goal);
    const dayData = window.AppedietDB.getDayLog(this.selectedDate);
    window.GoogleWorkspaceSync?.syncBurned?.(this.selectedDate, dayData.burned || 0);

    this.showToast(`تم حفظ خطوات اليوم (${steps.toLocaleString()} خطوة) بنجاح! 👟`);
    document.getElementById('exercise-logger-modal')?.classList.remove('active');
    this.refreshDashboard();
  }

  openWorkoutDetailModal(workout) {
    const modal = document.getElementById('workout-impact-details-modal');
    if (!modal || !workout) return;

    document.getElementById('detail-workout-icon').textContent = workout.icon || '🏋️';
    document.getElementById('detail-workout-name').textContent = workout.name;
    document.getElementById('detail-workout-quantity').textContent = workout.isRepBased 
      ? `${workout.reps} تكرار` 
      : `${workout.minutes} دقيقة`;

    document.getElementById('detail-workout-burned').textContent = `${workout.burnedKcal} kcal`;
    document.getElementById('detail-workout-protein').textContent = workout.proteinNeeded || '25-30 جم';
    document.getElementById('detail-workout-muscles').textContent = workout.targetMuscles || 'عضلات متعددة';
    document.getElementById('detail-workout-fat').textContent = `~${workout.fatLossGrams || Math.round((workout.burnedKcal/7.7)*10)/10} جم دهون`;

    document.getElementById('detail-workout-diet-impact').textContent = workout.dietGoalImpact || 'يزيد من عجز السعرات ويسرع نزول الوزن نحو 80 كجم مع الحفاظ على الكتلة العضلية.';
    document.getElementById('detail-workout-meal').textContent = workout.postWorkoutMeal || 'وجبة متوازنة تحتوي بروتين وكارب نظيف.';

    modal.classList.add('active');
  }

  /* ==========================================================================
     Android PWA Installation Logic
     ========================================================================== */
  bindPwaInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      document.getElementById('pwa-install-banner')?.classList.remove('hidden');
    });

    document.getElementById('btn-pwa-install')?.addEventListener('click', async () => {
      if (this.deferredInstallPrompt) {
        this.deferredInstallPrompt.prompt();
        const { outcome } = await this.deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') {
          this.showToast('جاري تثبيت Raheem Coach على هاتفك... 📲');
        }
        this.deferredInstallPrompt = null;
        document.getElementById('pwa-install-banner')?.classList.add('hidden');
      } else {
        alert("لتثبيت التطبيق على هاتف الأندرويد:\n1. اضغط على زر القائمة (⋮ الثلاث نقاط) بالمتصفح.\n2. اختر 'تثبيت التطبيق' (Install App) أو 'الإضافة للشاشة الرئيسية'.");
      }
    });
  }

  showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'app-toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.AppedietApp = new AppedietApp();
  window.RaheemCoachApp = window.AppedietApp;
});
