/**
 * Onboarding & Macro Wizard Controller
 * Raheem Coach - Precision Metabolic & Macro Calculator (Mifflin-St Jeor)
 */

class OnboardingWizard {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 5;
    this.planData = {
      gender: 'male',
      age: 25,
      height: 175,
      currentWeight: 80,
      goalWeight: 75,
      activityLevel: 'moderate',
      goal: 'lose',
      macroStyle: 'high_protein'
    };
    this.calculatedPlan = null;
    this.init();
  }

  init() {
    this.modal = document.getElementById('onboarding-quiz-modal');
    if (!this.modal) return;

    this.bindEvents();
    this.loadCurrentProfile();
  }

  loadCurrentProfile() {
    const profile = window.AppedietDB?.getProfile();
    if (profile) {
      this.planData.gender = profile.gender || 'male';
      this.planData.age = profile.age || 25;
      this.planData.height = profile.height || 175;
      this.planData.currentWeight = profile.currentWeight || 80;
      this.planData.goalWeight = profile.goalWeight || 75;
      this.planData.activityLevel = profile.activityLevel || 'moderate';
      this.planData.goal = profile.goal || 'lose';
      this.planData.macroStyle = profile.macroStyle || 'high_protein';
    }
  }

  bindEvents() {
    // Close button
    document.getElementById('btn-close-onboarding')?.addEventListener('click', () => {
      this.close();
    });

    // Reopen from settings
    document.getElementById('btn-reopen-onboarding')?.addEventListener('click', () => {
      document.getElementById('settings-sync-modal')?.classList.remove('active');
      this.open(1);
    });

    // Navigation buttons
    document.getElementById('btn-wizard-next')?.addEventListener('click', () => {
      this.nextStep();
    });

    document.getElementById('btn-wizard-prev')?.addEventListener('click', () => {
      this.prevStep();
    });

    // Save & Apply Button
    document.getElementById('btn-wizard-apply-plan')?.addEventListener('click', () => {
      this.applyAndSavePlan();
    });

    // Step 1: Gender Selection Cards
    document.querySelectorAll('.gender-select-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.gender-select-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.planData.gender = card.dataset.gender;
      });
    });

    // Step 2: Activity Cards
    document.querySelectorAll('.activity-select-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.activity-select-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.planData.activityLevel = card.dataset.activity;
      });
    });

    // Step 3: Goal Cards
    document.querySelectorAll('.goal-select-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.goal-select-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.planData.goal = card.dataset.goal;
      });
    });

    // Step 4: Macro Style Cards
    document.querySelectorAll('.macro-select-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.macro-select-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.planData.macroStyle = card.dataset.macro;
      });
    });

    // Outside click dismiss
    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });
  }

  open(step = 1) {
    if (!this.modal) this.modal = document.getElementById('onboarding-quiz-modal');
    if (!this.modal) return;

    this.loadCurrentProfile();
    this.populateInputsFromData();
    this.currentStep = step;
    this.renderStep();
    this.modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  close() {
    if (!this.modal) return;
    this.modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  populateInputsFromData() {
    // Step 1 inputs
    const ageInput = document.getElementById('wizard-input-age');
    if (ageInput) ageInput.value = this.planData.age;

    const heightInput = document.getElementById('wizard-input-height');
    if (heightInput) heightInput.value = this.planData.height;

    const weightInput = document.getElementById('wizard-input-weight');
    if (weightInput) weightInput.value = this.planData.currentWeight;

    const goalWeightInput = document.getElementById('wizard-input-goal-weight');
    if (goalWeightInput) goalWeightInput.value = this.planData.goalWeight;

    // Card selections
    document.querySelectorAll('.gender-select-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.gender === this.planData.gender);
    });

    document.querySelectorAll('.activity-select-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.activity === this.planData.activityLevel);
    });

    document.querySelectorAll('.goal-select-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.goal === this.planData.goal);
    });

    document.querySelectorAll('.macro-select-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.macro === this.planData.macroStyle);
    });
  }

  gatherStepInputs() {
    if (this.currentStep === 1) {
      const ageVal = parseFloat(document.getElementById('wizard-input-age')?.value);
      const heightVal = parseFloat(document.getElementById('wizard-input-height')?.value);
      const weightVal = parseFloat(document.getElementById('wizard-input-weight')?.value);

      if (ageVal && ageVal > 10 && ageVal < 100) this.planData.age = ageVal;
      if (heightVal && heightVal > 100 && heightVal < 250) this.planData.height = heightVal;
      if (weightVal && weightVal > 30 && weightVal < 300) this.planData.currentWeight = weightVal;
    } else if (this.currentStep === 3) {
      const goalW = parseFloat(document.getElementById('wizard-input-goal-weight')?.value);
      if (goalW && goalW > 30 && goalW < 300) this.planData.goalWeight = goalW;
    }
  }

  nextStep() {
    this.gatherStepInputs();
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      if (this.currentStep === 5) {
        this.calculateAndRenderResults();
      }
      this.renderStep();
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.renderStep();
    }
  }

  renderStep() {
    // Hide all steps, show current
    document.querySelectorAll('.wizard-step-pane').forEach((pane, idx) => {
      pane.classList.toggle('active', (idx + 1) === this.currentStep);
    });

    // Update Progress Indicator
    const progressPct = Math.round((this.currentStep / this.totalSteps) * 100);
    const fillEl = document.getElementById('wizard-progress-bar-fill');
    if (fillEl) fillEl.style.width = `${progressPct}%`;

    const stepLabel = document.getElementById('wizard-step-counter');
    if (stepLabel) stepLabel.textContent = `الخطوة ${this.currentStep} من ${this.totalSteps}`;

    // Update Nav Buttons
    const prevBtn = document.getElementById('btn-wizard-prev');
    const nextBtn = document.getElementById('btn-wizard-next');
    const applyBtn = document.getElementById('btn-wizard-apply-plan');

    if (prevBtn) {
      prevBtn.style.visibility = (this.currentStep === 1) ? 'hidden' : 'visible';
    }

    if (nextBtn && applyBtn) {
      if (this.currentStep === this.totalSteps) {
        nextBtn.style.display = 'none';
        applyBtn.style.display = 'flex';
      } else {
        nextBtn.style.display = 'flex';
        applyBtn.style.display = 'none';
      }
    }
  }

  calculateAndRenderResults() {
    if (!window.AppedietDB) return;
    this.calculatedPlan = window.AppedietDB.calculateDetailedPlan(this.planData);

    const p = this.calculatedPlan;

    // 1. Calorie Goal & Badges
    const targetKcalEl = document.getElementById('res-target-kcal');
    if (targetKcalEl) targetKcalEl.textContent = `${p.calorieGoal} سعرة`;

    const deficitBadge = document.getElementById('res-goal-badge');
    if (deficitBadge) deficitBadge.textContent = p.deficitOrSurplusLabel;

    const bmrValEl = document.getElementById('res-bmr-val');
    if (bmrValEl) bmrValEl.textContent = `${p.bmr} kcal`;

    const tdeeValEl = document.getElementById('res-tdee-val');
    if (tdeeValEl) tdeeValEl.textContent = `${p.tdee} kcal`;

    // 2. Macros Breakdown
    // Protein
    const protVal = document.getElementById('res-protein-val');
    if (protVal) protVal.textContent = `${p.proteinGoal} جم`;
    const protKcal = document.getElementById('res-protein-kcal');
    if (protKcal) protKcal.textContent = `${p.proteinKcal} kcal (${p.proteinPct}%)`;
    const protBar = document.getElementById('res-protein-bar');
    if (protBar) protBar.style.width = `${Math.min(100, p.proteinPct)}%`;

    // Carbs
    const carbVal = document.getElementById('res-carb-val');
    if (carbVal) carbVal.textContent = `${p.carbGoal} جم`;
    const carbKcal = document.getElementById('res-carb-kcal');
    if (carbKcal) carbKcal.textContent = `${p.carbKcal} kcal (${p.carbPct}%)`;
    const carbBar = document.getElementById('res-carb-bar');
    if (carbBar) carbBar.style.width = `${Math.min(100, p.carbPct)}%`;

    // Fat
    const fatVal = document.getElementById('res-fat-val');
    if (fatVal) fatVal.textContent = `${p.fatGoal} جم`;
    const fatKcal = document.getElementById('res-fat-kcal');
    if (fatKcal) fatKcal.textContent = `${p.fatKcal} kcal (${p.fatPct}%)`;
    const fatBar = document.getElementById('res-fat-bar');
    if (fatBar) fatBar.style.width = `${Math.min(100, p.fatPct)}%`;

    // Water
    const waterVal = document.getElementById('res-water-val');
    if (waterVal) waterVal.textContent = `${p.waterMl} مل (~${p.waterCups} أكواب)`;

    // Coach Advice Text
    const adviceEl = document.getElementById('res-coach-advice');
    if (adviceEl) {
      if (this.planData.goal === 'lose') {
        adviceEl.innerHTML = `
          🎯 <strong>توجيه كوتش رحيم:</strong> للحصول على أفضل نزول للدهون دون خسارة العضلات، ركّز على تناول <strong>${p.proteinGoal} جم بروتين</strong> يومياً (صدر دجاج، بيض، زبادي يوناني، لحم قليل الدهن)، واشرب <strong>${p.waterCups} أكواب ماء</strong>. وتذكّر: السعرات التي تحرقها في التمارين هي مكافأة لحرق الدهون ولن تُضاف لطعامك! 🔥
        `;
      } else if (this.planData.goal === 'gain') {
        adviceEl.innerHTML = `
          🏋️ <strong>توجيه كوتش رحيم:</strong> لبناء كتلة عضلية صافية، التزم بتناول <strong>${p.calorieGoal} سعرة</strong> مع توزيع الماكروز وتدريبات المقاومة المتزايدة تدريجياً (Progressive Overload).
        `;
      } else {
        adviceEl.innerHTML = `
          ⚖️ <strong>توجيه كوتش رحيم:</strong> خطتك ممتازة للحفاظ على ثبات الوزن مع زيادة القوة وتحسين تناسق الجسم والشعور بالحيوية المستمرة.
        `;
      }
    }
  }

  applyAndSavePlan() {
    if (!this.calculatedPlan) {
      this.calculateAndRenderResults();
    }

    const p = this.calculatedPlan;
    const profile = window.AppedietDB.getProfile();

    // Update Profile
    profile.gender = this.planData.gender;
    profile.age = this.planData.age;
    profile.height = this.planData.height;
    profile.currentWeight = this.planData.currentWeight;
    profile.goalWeight = this.planData.goalWeight;
    profile.activityLevel = this.planData.activityLevel;
    profile.goal = this.planData.goal;
    profile.macroStyle = this.planData.macroStyle;

    profile.calorieGoal = p.calorieGoal;
    profile.proteinGoal = p.proteinGoal;
    profile.carbGoal = p.carbGoal;
    profile.fatGoal = p.fatGoal;
    profile.waterGoal = p.waterCups * 8; // in fl oz
    profile.onboardingCompleted = true;

    // Save to Local DB
    window.AppedietDB.saveProfile(profile);

    // Sync to Google Workspace if active
    if (window.GoogleWorkspaceSync && window.GoogleWorkspaceSync.isConfigured()) {
      window.GoogleWorkspaceSync.syncToGoogleSheet();
    }

    // Refresh Dashboard UI
    if (window.AppedietApp) {
      window.AppedietApp.refreshDashboard();
      window.AppedietApp.showToast(`تم اعتماد خطتك بنجاح: ${p.calorieGoal} سعرة يومياً 🎯🥗`);
    }

    this.close();
  }
}

// Auto instantiate when script loads
document.addEventListener('DOMContentLoaded', () => {
  window.OnboardingWizard = new OnboardingWizard();
});
