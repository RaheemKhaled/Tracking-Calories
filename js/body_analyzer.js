/**
 * Appediet Body Composition & Fat Distribution Analyzer
 * Analyzes body measurements, photos, and calculates body fat percentage and fat distribution heatmap.
 */

class BodyCompositionAnalyzer {
  constructor() {
    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.viewContainer = document.getElementById('body-progress-view');
    this.form = document.getElementById('body-analysis-form');
    this.resultsCard = document.getElementById('body-analysis-results');

    // Input fields
    this.inputWeight = document.getElementById('input-body-weight');
    this.inputHeight = document.getElementById('input-body-height');
    this.inputGoalWeight = document.getElementById('input-body-goal-weight');
    this.inputWaist = document.getElementById('input-body-waist');
    this.inputNeck = document.getElementById('input-body-neck');
    this.inputHip = document.getElementById('input-body-hip');
    this.inputChest = document.getElementById('input-body-chest');
    this.inputGender = document.getElementById('input-body-gender');
    this.inputAge = document.getElementById('input-body-age');

    // Photo inputs
    this.frontPhotoInput = document.getElementById('body-front-photo-input');
    this.sidePhotoInput = document.getElementById('body-side-photo-input');
    this.frontPhotoThumb = document.getElementById('front-photo-thumb');
    this.sidePhotoThumb = document.getElementById('side-photo-thumb');

    // Result displays
    this.resFatPct = document.getElementById('res-body-fat-pct');
    this.resFatMassKg = document.getElementById('res-fat-mass-kg');
    this.resLeanMassKg = document.getElementById('res-lean-mass-kg');
    this.resBmi = document.getElementById('res-body-bmi');
    this.resFatStrategy = document.getElementById('res-fat-strategy');

    // Distribution bars
    this.distAbdomenBar = document.getElementById('dist-bar-abdomen');
    this.distAbdomenVal = document.getElementById('dist-val-abdomen');
    this.distChestBar = document.getElementById('dist-bar-chest');
    this.distChestVal = document.getElementById('dist-val-chest');
    this.distFlanksBar = document.getElementById('dist-bar-flanks');
    this.distFlanksVal = document.getElementById('dist-val-flanks');
    this.distThighsBar = document.getElementById('dist-bar-thighs');
    this.distThighsVal = document.getElementById('dist-val-thighs');

    // SVG Body Heatmap elements
    this.svgBellyHeat = document.getElementById('svg-heat-belly');
    this.svgChestHeat = document.getElementById('svg-heat-chest');
    this.svgFlanksHeat = document.getElementById('svg-heat-flanks');
    this.svgThighsHeat = document.getElementById('svg-heat-thighs');
  }

  bindEvents() {
    // Form submit
    this.form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.runAnalysis();
    });

    // Front photo upload
    this.frontPhotoInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file && this.frontPhotoThumb) {
        this.frontPhotoThumb.src = URL.createObjectURL(file);
        this.frontPhotoThumb.classList.remove('hidden');
      }
    });

    // Side photo upload
    this.sidePhotoInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file && this.sidePhotoThumb) {
        this.sidePhotoThumb.src = URL.createObjectURL(file);
        this.sidePhotoThumb.classList.remove('hidden');
      }
    });

    // Recalculate and update goals button
    document.getElementById('btn-apply-goals-to-profile')?.addEventListener('click', () => {
      this.applyGoalsToUserProfile();
    });
  }

  /**
   * Load latest analysis or profile data into inputs
   */
  loadInitialData() {
    const profile = window.AppedietDB.getProfile();
    const history = window.AppedietDB.getBodyHistory();
    const latest = history[0] || {};

    if (this.inputWeight) this.inputWeight.value = latest.weight || profile.currentWeight || 95;
    if (this.inputHeight) this.inputHeight.value = latest.height || profile.height || 180;
    if (this.inputGoalWeight) this.inputGoalWeight.value = profile.goalWeight || 80;
    if (this.inputWaist) this.inputWaist.value = latest.waist || 98;
    if (this.inputNeck) this.inputNeck.value = latest.neck || 40;
    if (this.inputHip) this.inputHip.value = latest.hip || 104;
    if (this.inputChest) this.inputChest.value = latest.chest || 102;
    if (this.inputGender) this.inputGender.value = profile.gender || 'male';
    if (this.inputAge) this.inputAge.value = profile.age || 28;

    if (latest && latest.bodyFatPercent) {
      this.displayResults(latest);
    }

    this.renderSemiMonthlySection();
  }

  /**
   * Render Semi-Monthly (15-Day) Body Tracking & Comparison
   */
  renderSemiMonthlySection() {
    const container = document.getElementById('semi-monthly-tracking-card');
    if (!container) return;

    const status = window.AppedietDB.getSemiMonthlyStatus();
    if (!status.hasData) {
      container.innerHTML = `
        <div style="background:#1a202c; border:1px dashed rgba(255,255,255,0.15); border-radius:14px; padding:14px; text-align:center;">
          <span style="font-size:24px; display:block; margin-bottom:4px;">⏱️</span>
          <strong style="color:#fff; font-size:14px;">التتبع والتحديث نصف الشهري (كل 15 يوماً)</strong>
          <p style="font-size:12px; color:var(--text-secondary); margin-top:4px;">
            سجل مقاساتك اليوم لتبدأ دورتك التتبعية الأولى ومقارنة التغير كل أسبوعين تلقائياً.
          </p>
        </div>
      `;
      return;
    }

    const { isDue, daysRemaining, daysSinceLast, nextDueDate, lastCheckin, diff, historyList } = status;

    let diffHtml = '';
    if (diff) {
      const getDiffBadge = (val, unit = '', invert = false) => {
        if (val === null || val === undefined) return '<span style="color:var(--text-muted);">-</span>';
        const isGood = invert ? (val > 0) : (val <= 0); // usually weight/fat/waist drop is good
        const sign = val > 0 ? `+${val}` : `${val}`;
        const color = isGood ? '#34d399' : '#f87171';
        const arrow = val > 0 ? '▲' : (val < 0 ? '▼' : '▬');
        return `<span style="color:${color}; font-weight:700;">${arrow} ${sign} ${unit}</span>`;
      };

      diffHtml = `
        <div style="background:rgba(0,0,0,0.25); border-radius:12px; padding:12px; margin-top:10px;">
          <div style="font-size:12px; font-weight:700; color:#60a5fa; margin-bottom:8px;">📊 الفارق مقارنة بالقياس نصف الشهري السابق:</div>
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; text-align:center;">
            <div style="background:#131824; padding:8px 4px; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
              <div style="font-size:11px; color:#94a3b8;">الوزن</div>
              <div style="font-size:12.5px; margin-top:2px;">${getDiffBadge(diff.weight, 'كجم')}</div>
            </div>
            <div style="background:#131824; padding:8px 4px; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
              <div style="font-size:11px; color:#94a3b8;">نسبة الدهون</div>
              <div style="font-size:12.5px; margin-top:2px;">${getDiffBadge(diff.bodyFat, '%')}</div>
            </div>
            <div style="background:#131824; padding:8px 4px; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
              <div style="font-size:11px; color:#94a3b8;">محيط الخصر</div>
              <div style="font-size:12.5px; margin-top:2px;">${getDiffBadge(diff.waist, 'سم')}</div>
            </div>
          </div>
        </div>
      `;
    }

    const historyItemsHtml = historyList.slice(0, 3).map((item, idx) => {
      const dStr = item.date ? item.date.split('T')[0] : 'تاريخ سابق';
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#131824; padding:8px 12px; border-radius:8px; font-size:12px; border:1px solid rgba(255,255,255,0.05);">
          <div>
            <span style="font-weight:700; color:#e2e8f0;">${dStr}</span>
            <span style="font-size:11px; color:#94a3b8; margin-right:6px;">(${idx === 0 ? 'الأحدث' : 'دورة سابقة'})</span>
          </div>
          <div style="display:flex; gap:10px; color:#cbd5e1;">
            <span><strong>${item.weight}</strong> كجم</span>
            <span><strong>${item.bodyFatPercent}%</strong> دهون</span>
            <span>خصر: <strong>${item.waist}</strong> سم</span>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.98)); border:1px solid ${isDue ? 'rgba(239, 68, 68, 0.5)' : 'rgba(59, 130, 246, 0.35)'}; border-radius:16px; padding:14px; position:relative;">
        
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
          <div>
            <div style="font-size:14.5px; font-weight:800; color:#fff; display:flex; align-items:center; gap:6px;">
              <span>⏱️</span>
              <span>التحديث والتتبع نصف الشهري (15 يوماً)</span>
            </div>
            <div style="font-size:11.5px; color:#94a3b8; margin-top:2px;">
              دورة قياس دورية كل 15 يوماً لرصد خسارة الدهون الحقيقية وتطور المقاسات.
            </div>
          </div>
          <span style="font-size:11px; font-weight:700; padding:4px 10px; border-radius:20px; background:${isDue ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}; color:${isDue ? '#fca5a5' : '#34d399'}; border:1px solid ${isDue ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'};">
            ${isDue ? 'حان موعد القياس 🔔' : `متبقي ${daysRemaining} يوم`}
          </span>
        </div>

        <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.04); border-radius:10px; padding:8px 12px; font-size:12px; margin-top:8px;">
          <span style="color:#cbd5e1;">آخر قياس مسجل: <strong>${lastCheckin.date ? lastCheckin.date.split('T')[0] : '-'}</strong> (قبل ${daysSinceLast} يوم)</span>
          <span style="color:#60a5fa;">الموعد القادم: <strong>${nextDueDate}</strong></span>
        </div>

        ${diffHtml}

        <div style="margin-top:12px;">
          <div style="font-size:11.5px; font-weight:700; color:#94a3b8; margin-bottom:6px;">سجل القياسات نصف الشهرية الأخيرة:</div>
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${historyItemsHtml}
          </div>
        </div>

        <button type="button" id="btn-trigger-semi-monthly-checkin" style="width:100%; margin-top:12px; background:linear-gradient(135deg, #2563eb, #1d4ed8); color:#fff; border:none; border-radius:10px; padding:10px; font-size:12.5px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
          <span>📏</span>
          <span>${isDue ? 'تسجيل قياس نصف شهري جديد الآن' : 'تحديث قياسات اليوم ومقارنة النتائج'}</span>
        </button>

      </div>
    `;

    document.getElementById('btn-trigger-semi-monthly-checkin')?.addEventListener('click', () => {
      this.form?.scrollIntoView({ behavior: 'smooth' });
      this.inputWaist?.focus();
      window.AppedietApp?.showToast('راجع مقاساتك واضغط "تحليل نسبة وتوزيع الدهون" للتسجيل 🎯');
    });
  }

  async runAnalysis() {
    window.AppedietApp?.showToast('جاري تحليل مقاسات الجسم والصور بالذكاء الاصطناعي... 🧬');

    const params = {
      weight: parseFloat(this.inputWeight.value),
      height: parseFloat(this.inputHeight.value),
      goalWeight: parseFloat(this.inputGoalWeight.value),
      waist: parseFloat(this.inputWaist.value),
      neck: parseFloat(this.inputNeck.value),
      hip: parseFloat(this.inputHip.value),
      chest: parseFloat(this.inputChest.value),
      gender: this.inputGender.value,
      age: parseInt(this.inputAge.value),
      frontPhoto: this.frontPhotoThumb?.src || null,
      sidePhoto: this.sidePhotoThumb?.src || null
    };

    const analysis = await window.GeminiAI.analyzeBodyComposition(params);
    window.AppedietDB.addBodyAnalysis(analysis);
    window.GoogleWorkspaceSync?.syncBodyComposition(analysis);

    this.displayResults(analysis);
    this.renderSemiMonthlySection();
    window.AppedietApp?.showToast(`تم حساب نسبة الدهون (${analysis.bodyFatPercent}%) وخريطة التوزيع بنجاح! ✨`);
    window.AppedietApp?.refreshDashboard();
  }

  displayResults(data) {
    if (!this.resultsCard) return;
    this.resultsCard.classList.remove('hidden');

    if (this.resFatPct) this.resFatPct.textContent = `${data.bodyFatPercent}%`;
    if (this.resFatMassKg) this.resFatMassKg.textContent = `${data.fatMassKg} kg`;
    if (this.resLeanMassKg) this.resLeanMassKg.textContent = `${data.leanMassKg} kg`;

    // Calculate BMI
    const hM = data.height / 100;
    const bmi = Math.round((data.weight / (hM * hM)) * 10) / 10;
    if (this.resBmi) this.resBmi.textContent = bmi;

    if (this.resFatStrategy) this.resFatStrategy.textContent = data.aiNotes;

    // Distribution breakdown
    const dist = data.fatDistribution || { abdomen: 42, chest: 22, flanks: 24, thighs: 12 };

    if (this.distAbdomenBar) this.distAbdomenBar.style.width = `${dist.abdomen}%`;
    if (this.distAbdomenVal) this.distAbdomenVal.textContent = `${dist.abdomen}%`;

    if (this.distChestBar) this.distChestBar.style.width = `${dist.chest}%`;
    if (this.distChestVal) this.distChestVal.textContent = `${dist.chest}%`;

    if (this.distFlanksBar) this.distFlanksBar.style.width = `${dist.flanks}%`;
    if (this.distFlanksVal) this.distFlanksVal.textContent = `${dist.flanks}%`;

    if (this.distThighsBar) this.distThighsBar.style.width = `${dist.thighs}%`;
    if (this.distThighsVal) this.distThighsVal.textContent = `${dist.thighs}%`;

    // Dynamic Heatmap colors on SVG Body Silhouette
    this.updateSvgHeatmap(dist);
  }

  updateSvgHeatmap(dist) {
    // Helper to calculate heat color from percentage
    const getHeatColor = (pct) => {
      if (pct >= 35) return 'rgba(239, 68, 68, 0.85)'; // Red / Intense
      if (pct >= 24) return 'rgba(249, 115, 22, 0.8)'; // Orange
      if (pct >= 18) return 'rgba(245, 158, 11, 0.7)'; // Amber
      return 'rgba(16, 185, 129, 0.5)'; // Moderate
    };

    if (this.svgBellyHeat) this.svgBellyHeat.setAttribute('fill', getHeatColor(dist.abdomen));
    if (this.svgChestHeat) this.svgChestHeat.setAttribute('fill', getHeatColor(dist.chest));
    if (this.svgFlanksHeat) this.svgFlanksHeat.setAttribute('fill', getHeatColor(dist.flanks));
    if (this.svgThighsHeat) this.svgThighsHeat.setAttribute('fill', getHeatColor(dist.thighs));
  }

  applyGoalsToUserProfile() {
    const profile = window.AppedietDB.getProfile();
    profile.currentWeight = parseFloat(this.inputWeight.value) || profile.currentWeight;
    profile.height = parseFloat(this.inputHeight.value) || profile.height;
    profile.goalWeight = parseFloat(this.inputGoalWeight.value) || profile.goalWeight;
    profile.gender = this.inputGender.value || profile.gender;
    profile.age = parseInt(this.inputAge.value) || profile.age;

    // Recalculate goals
    const newGoals = window.AppedietDB.calculateGoals(profile);
    profile.calorieGoal = newGoals.calorieGoal;
    profile.proteinGoal = newGoals.proteinGoal;
    profile.fatGoal = newGoals.fatGoal;
    profile.carbGoal = newGoals.carbGoal;

    window.AppedietDB.saveProfile(profile);
    window.AppedietApp?.showToast('تم تحديث ميزانية السعرات والماكروز اليومية بنجاح! 🎯');
    window.AppedietApp?.refreshDashboard();
  }
}

window.BodyAnalyzer = BodyCompositionAnalyzer;
