/**
 * Appediet Main Application Controller
 * Orchestrates views, state synchronization, navigation tabs, and dialog interactions.
 */

class AppedietApp {
  constructor() {
    this.currentView = 'tracker';
    this.selectedDate = this.getTodayDateString();
    this.deferredInstallPrompt = null;

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
    // Initialize components
    this.googleAuth = new window.GoogleAuthManager();
    this.scanner = new window.NutritionScanner();
    this.bodyAnalyzer = new window.BodyAnalyzer();
    this.coach = new window.HungerCoach();

    this.initCalendar();
    this.bindNavigation();
    this.bindDashboardEvents();
    this.bindPwaInstall();
    this.refreshDashboard();

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.log('SW registration note:', err);
      });
    }
  }

  /* ==========================================================================
     Calendar Strip & Date Switcher (Screenshot 4)
     ========================================================================== */
  initCalendar() {
    const calendarContainer = document.getElementById('calendar-strip-container');
    if (!calendarContainer) return;

    calendarContainer.innerHTML = '';
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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
    const remainingKcal = Math.max(0, goalKcal - eatenKcal + burnedKcal);

    // 1. Budget Card Updates
    document.getElementById('dash-remaining-kcal').textContent = remainingKcal;
    document.getElementById('dash-goal-kcal-badge').textContent = `Goal: ${goalKcal} kcal >`;
    document.getElementById('dash-eaten-kcal').textContent = `${eatenKcal} kcal`;
    document.getElementById('dash-burned-kcal').textContent = `${burnedKcal} kcal`;

    // Radial Progress Arc
    const progressPct = Math.min(1, eatenKcal / goalKcal);
    const arcLength = 283; // Circumference of semicircle r=90
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
          <div style="text-align:center; padding:12px; color:var(--text-muted); font-size:12px; background:rgba(255,255,255,0.02); border-radius:10px;">
            <span>🍽️ لا توجد وجبات مسجلة لهذا اليوم بعد</span>
          </div>
        `;
      } else {
        const mealIcons = { Breakfast: '☕', Lunch: '🍲', Dinner: '🔔', Snack: '🥪' };
        mealsListContainer.innerHTML = mealsLogged.map(m => {
          const icon = mealIcons[m.mealType] || '🍴';
          const imgHtml = m.imageUrl 
            ? `<img src="${m.imageUrl}" style="width:40px; height:40px; border-radius:10px; object-fit:cover; border:1px solid rgba(255,255,255,0.15);" alt="${m.name}">`
            : `<div style="width:40px; height:40px; border-radius:10px; background:#1e293b; display:flex; align-items:center; justify-content:center; font-size:20px;">${icon}</div>`;

          return `
            <div class="logged-meal-item-card" data-meal-id="${m.id}" style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:8px 10px; cursor:pointer; transition:background 0.2s;">
              <div style="display:flex; align-items:center; gap:10px;">
                ${imgHtml}
                <div>
                  <div style="font-weight:700; font-size:13px; color:#f8fafc; display:flex; align-items:center; gap:6px;">
                    <span>${m.name}</span>
                    <span style="font-size:10px; background:rgba(59,130,246,0.2); color:#93c5fd; padding:1px 6px; border-radius:6px;">${m.mealType}</span>
                  </div>
                  <div style="font-size:11px; color:#94a3b8; margin-top:2px;">
                    <strong style="color:#f59e0b;">${m.calories} kcal</strong> • P: ${m.protein}g | C: ${m.carb}g | F: ${m.fat}g
                  </div>
                </div>
              </div>
              <button class="btn-edit-meal-badge" style="background:#1e293b; color:#38bdf8; border:1px solid rgba(56,189,248,0.3); border-radius:8px; padding:4px 8px; font-size:11px; font-weight:700; cursor:pointer;">
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
  }

  /* ==========================================================================
     Dashboard Interactive Clicks (Water, Weight Update, Workout, Mood, Settings)
     ========================================================================== */
  bindDashboardEvents() {
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

    // Add Workout button
    document.getElementById('btn-add-workout')?.addEventListener('click', () => {
      const kcal = prompt('أدخل السعرات المحروقة في التمرين (kcal):', '250');
      if (kcal && !isNaN(kcal)) {
        window.AppedietDB.updateBurned(this.selectedDate, parseInt(kcal));
        this.showToast(`تمت إضافة ${kcal} سعر محروق بنجاح! 🔥`);
        this.refreshDashboard();
      }
    });

    // Update Weight button
    document.getElementById('btn-update-weight-modal')?.addEventListener('click', () => {
      this.openWeightModal();
    });

    // Log Mood Feeling button
    document.getElementById('btn-log-feeling-modal')?.addEventListener('click', () => {
      this.openMoodModal();
    });

    // Goal Pill click
    document.getElementById('dash-goal-kcal-badge')?.addEventListener('click', () => {
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
