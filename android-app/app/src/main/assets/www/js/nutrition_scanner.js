/**
 * Appediet Nutrition & Food Scanner Component
 * Matches Screenshots 1 & 2 (Food Details & AI Insights Sheet)
 */

class NutritionScannerComponent {
  constructor() {
    this.currentMealType = 'Lunch';
    this.currentFoodData = null;
    this.basePerUnitData = null;
    this.currentQuantity = 1;
    this.capturedImageUrl = null;
    this.insightsUnlocked = false;
    this.editingMealId = null;
    this.editingDateStr = null;

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.modal = document.getElementById('food-scanner-modal');
    this.fileInput = document.getElementById('food-camera-file-input');
    this.photoPreview = document.getElementById('food-photo-preview');
    this.mealTypeBtn = document.getElementById('current-meal-type-badge');
    this.foodNameEl = document.getElementById('modal-food-name');
    this.quantityCountEl = document.getElementById('modal-stepper-count');
    this.caloriesValEl = document.getElementById('modal-calorie-val');
    this.carbValEl = document.getElementById('modal-carb-val');
    this.proteinValEl = document.getElementById('modal-protein-val');
    this.fatValEl = document.getElementById('modal-fat-val');
    this.showMoreBtn = document.getElementById('btn-show-more-nutrition');
    this.extendedNutrientsEl = document.getElementById('modal-extended-nutrients');
    this.fiberValEl = document.getElementById('modal-fiber-val');
    this.sugarValEl = document.getElementById('modal-sugar-val');
    this.sodiumValEl = document.getElementById('modal-sodium-val');
    this.foodListContainer = document.getElementById('modal-food-list-container');
    this.btnUnlockInsights = document.getElementById('btn-unlock-insights');
    this.insightsExpandedBox = document.getElementById('insights-expanded-box');
    this.insightWhatsGood = document.getElementById('insight-whats-good');
    this.insightWhatToImprove = document.getElementById('insight-what-to-improve');
    this.insightWhatToEatNext = document.getElementById('insight-what-to-eat-next');
    this.btnLogToMeal = document.getElementById('btn-log-to-meal-action');
    this.logBtnText = document.getElementById('log-btn-text');
    this.btnDeleteMeal = document.getElementById('btn-delete-meal-modal');

    // User Notes & Precision Ingredients Box
    this.notesCard = document.getElementById('food-notes-card');
    this.notesBody = document.getElementById('food-notes-body');
    this.notesInput = document.getElementById('food-user-notes-input');
    this.btnAnalyzeNotes = document.getElementById('btn-analyze-with-notes');
    this.btnAnalyzeNotesText = document.getElementById('btn-analyze-notes-text');
    this.btnAnalyzeNotesIcon = document.getElementById('btn-analyze-notes-icon');
    this.btnToggleNotes = document.getElementById('btn-toggle-notes');
    this.btnNotesHeaderToggle = document.getElementById('btn-notes-header-toggle');
  }

  bindEvents() {
    // Stepper buttons
    document.getElementById('btn-stepper-minus')?.addEventListener('click', () => this.updateQuantity(this.currentQuantity - 1));
    document.getElementById('btn-stepper-plus')?.addEventListener('click', () => this.updateQuantity(this.currentQuantity + 1));

    // File input change (Camera / Gallery)
    this.fileInput?.addEventListener('change', (e) => this.handleFileSelected(e));

    // Retake button
    document.getElementById('btn-retake-photo')?.addEventListener('click', () => this.fileInput?.click());

    // Show more toggle
    this.showMoreBtn?.addEventListener('click', () => {
      const isHidden = this.extendedNutrientsEl.classList.toggle('hidden');
      this.showMoreBtn.innerHTML = isHidden ? 'Show More ▾' : 'Show Less ▴';
    });

    // Notes collapse / expand toggle
    const toggleNotesFn = (e) => {
      if (e) e.stopPropagation();
      if (this.notesBody) {
        const isHidden = this.notesBody.classList.toggle('hidden');
        if (this.btnToggleNotes) this.btnToggleNotes.textContent = isHidden ? '▾' : '▴';
      }
    };
    this.btnToggleNotes?.addEventListener('click', toggleNotesFn);
    this.btnNotesHeaderToggle?.addEventListener('click', toggleNotesFn);

    // Quick ingredient tags click (one-tap appending)
    document.querySelectorAll('.quick-tag-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const tag = chip.dataset.tag || chip.textContent;
        const cleanTag = tag.replace(/^\+\s*/, '').trim();
        if (this.notesInput) {
          const current = this.notesInput.value.trim();
          this.notesInput.value = current ? `${current}، ${cleanTag}` : cleanTag;
          this.notesInput.focus();
        }
      });
    });

    // Button: Trigger AI analysis with photo + user notes
    this.btnAnalyzeNotes?.addEventListener('click', () => this.triggerAnalysisWithNotes());

    // Edit food name
    document.getElementById('btn-edit-food-name')?.addEventListener('click', () => {
      const newName = prompt('اسم الطعام أو المشروب:', this.foodNameEl.textContent);
      if (newName && newName.trim()) {
        this.foodNameEl.textContent = newName.trim();
        if (this.currentFoodData) this.currentFoodData.food_name = newName.trim();
      }
    });

    // Edit calories
    document.getElementById('btn-edit-calories')?.addEventListener('click', () => {
      const newCal = prompt('تعديل السعرات الحرارية:', this.caloriesValEl.textContent);
      if (newCal && !isNaN(newCal)) {
        const val = parseInt(newCal);
        this.caloriesValEl.textContent = val;
        if (this.basePerUnitData) {
          this.basePerUnitData.calories = Math.round(val / this.currentQuantity);
        }
      }
    });

    // Meal type selector dropdown
    this.mealTypeBtn?.addEventListener('click', () => {
      const meals = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
      const curIdx = meals.indexOf(this.currentMealType);
      const nextMeal = meals[(curIdx + 1) % meals.length];
      this.setMealType(nextMeal);
    });

    // Unlock Insights button
    this.btnUnlockInsights?.addEventListener('click', () => {
      this.insightsUnlocked = true;
      this.insightsExpandedBox?.classList.remove('hidden');
      this.btnUnlockInsights.textContent = 'Insights Unlocked ✓';
      this.btnUnlockInsights.style.backgroundColor = '#10b981';
    });

    // Log to Meal button
    this.btnLogToMeal?.addEventListener('click', () => this.saveAndLogMeal());

    // Delete Meal button (in edit mode)
    this.btnDeleteMeal?.addEventListener('click', () => this.deleteCurrentMeal());

    // Close modal
    document.getElementById('btn-close-food-modal')?.addEventListener('click', () => this.close());
  }

  setMealType(mealType) {
    this.currentMealType = mealType;
    if (this.mealTypeBtn) this.mealTypeBtn.innerHTML = `${mealType} ▾`;
    if (this.logBtnText && !this.editingMealId) this.logBtnText.textContent = `Log to ${mealType}`;
  }

  /**
   * Open scanner modal directly with camera or photo
   */
  openWithCapture(mealType = 'Lunch') {
    this.editingMealId = null;
    this.editingDateStr = null;
    this.btnDeleteMeal?.classList.add('hidden');
    this.setMealType(mealType);
    this.fileInput.click();
  }

  /**
   * Open modal to review and edit an existing logged meal
   */
  openForEdit(mealRecord, dateStr) {
    this.editingMealId = mealRecord.id;
    this.editingDateStr = dateStr || window.AppedietApp?.getSelectedDate() || new Date().toISOString().split('T')[0];
    this.setMealType(mealRecord.mealType || 'Lunch');

    if (this.notesInput) {
      this.notesInput.value = mealRecord.notes || '';
    }

    const data = {
      imageUrl: mealRecord.imageUrl || '',
      food_name: mealRecord.name,
      food_name_ar: mealRecord.name,
      serving_size: mealRecord.serving || '1 serving',
      serving_size_ar: mealRecord.serving || '1 حصة',
      quantity: mealRecord.quantity || 1,
      calories: mealRecord.calories,
      carb_g: mealRecord.carb,
      protein_g: mealRecord.protein,
      fat_g: mealRecord.fat,
      fiber_g: mealRecord.fiber || 0,
      sugar_g: mealRecord.sugar || 0,
      sodium_mg: mealRecord.sodium || 0,
      insights: mealRecord.insights || {
        what_is_good: 'وجبة مسجلة مسبقاً في حسابك.',
        what_to_improve: 'يمكنك تعديل الكميات أو المكونات بدقة.',
        what_to_eat_next: 'وازن الماكروز المتبقية لبقية اليوم.'
      }
    };

    this.populateModal(data);

    if (this.logBtnText) {
      this.logBtnText.textContent = 'حفظ التعديلات في الوجبة ✏️';
    }
    if (this.btnDeleteMeal) {
      this.btnDeleteMeal.classList.remove('hidden');
    }

    this.modal.classList.add('active');
  }

  /**
   * Delete currently edited meal
   */
  deleteCurrentMeal() {
    if (!this.editingMealId) return;
    const confirmed = confirm('هل أنت متأكد من رغبتك في حذف هذه الوجبة؟ 🗑️');
    if (confirmed) {
      window.AppedietDB.deleteMeal(this.editingDateStr, this.editingMealId);
      window.AppedietApp?.showToast('تم حذف الوجبة بنجاح 🗑️');
      window.AppedietApp?.refreshDashboard();
      this.close();
    }
  }

  /**
   * Open modal with custom healthy meal template (e.g. from Recipes)
   */
  openWithCustomMeal(name, calories = 300, protein = 20, carb = 25, fat = 10) {
    this.setMealType(this.currentMealType || 'Breakfast');
    if (this.notesInput) {
      this.notesInput.value = name;
    }
    const mealData = {
      imageUrl: '',
      food_name: name,
      food_name_ar: name,
      serving_size: '1 serving',
      serving_size_ar: 'حصة واحدة',
      quantity: 1,
      calories: calories,
      carb_g: carb,
      protein_g: protein,
      fat_g: fat,
      fiber_g: 4,
      sugar_g: 2,
      sodium_mg: 350,
      insights: {
        what_is_good: 'وجبة صحية ومحسوبة الماكروز تدعم نزول الوزن.',
        what_to_improve: 'تناول كمية ماء كافية مع الوجبة.',
        what_to_eat_next: 'سناك خفيف عند الشعور بالجوع.'
      }
    };
    this.populateModal(mealData);
    this.modal.classList.add('active');
  }

  async handleFileSelected(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    this.selectedFile = file;
    const tempUrl = URL.createObjectURL(file);
    this.capturedImageUrl = tempUrl;

    if (this.photoPreview) {
      this.photoPreview.src = tempUrl;
      this.photoPreview.style.display = 'block';
      const placeholder = document.getElementById('food-photo-placeholder');
      if (placeholder) placeholder.style.display = 'none';
    }

    // Open notes card prominently so user can specify ingredients
    if (this.notesBody) {
      this.notesBody.classList.remove('hidden');
      if (this.btnToggleNotes) this.btnToggleNotes.textContent = '▴';
    }

    if (this.foodNameEl) {
      this.foodNameEl.textContent = 'وجبة جاهزة للفحص 📸';
    }

    if (this.btnAnalyzeNotesText) {
      this.btnAnalyzeNotesText.textContent = 'تحليل الوجبة بالصورة والمكونات المكتوبة ⚡';
    }
    if (this.btnAnalyzeNotesIcon) {
      this.btnAnalyzeNotesIcon.textContent = '⚡';
    }
    if (this.btnAnalyzeNotes) {
      this.btnAnalyzeNotes.disabled = false;
    }

    this.modal.classList.add('active');

    // Auto-focus notes input for instant typing
    setTimeout(() => {
      this.notesInput?.focus();
    }, 250);

    window.AppedietApp?.showToast('تم التقاط الصورة! اكتب تفاصيل المكونات بدقة ثم اضغط فحص ✍️');
  }

  /**
   * Execute Multimodal AI Analysis with Image + User Written Notes
   */
  async triggerAnalysisWithNotes() {
    if (!this.selectedFile && !this.capturedImageUrl) {
      this.fileInput.click();
      return;
    }

    const userNotes = this.notesInput?.value?.trim() || '';

    // Set loading state
    if (this.btnAnalyzeNotes) this.btnAnalyzeNotes.disabled = true;
    if (this.btnAnalyzeNotesIcon) this.btnAnalyzeNotesIcon.textContent = '⏳';
    if (this.btnAnalyzeNotesText) this.btnAnalyzeNotesText.textContent = 'جاري الفحص بالذكاء الاصطناعي (الصورة + المكونات)...';
    if (this.foodNameEl) this.foodNameEl.textContent = 'جاري تدقيق المكونات وحساب السعرات... ⏳';

    window.AppedietApp?.showToast('كوتش رحيم يحلل الصورة مع تفاصيل مكوناتك المكتوبة... 🚀');

    try {
      const analysis = await window.GeminiAI.analyzeFood(
        this.selectedFile || this.capturedImageUrl, 
        this.currentMealType, 
        userNotes
      );
      this.populateModal(analysis);

      if (this.btnAnalyzeNotes) this.btnAnalyzeNotes.disabled = false;
      if (this.btnAnalyzeNotesIcon) this.btnAnalyzeNotesIcon.textContent = '🔄';
      if (this.btnAnalyzeNotesText) this.btnAnalyzeNotesText.textContent = 'إعادة الحساب بالملاحظات المعدلة';

      window.AppedietApp?.showToast(`تم الحساب الدقيق: ${analysis.food_name_ar || analysis.food_name} 🎯`);
    } catch (err) {
      console.error('Analysis failed:', err);
      // Smart local estimation with user notes
      const fallback = window.GeminiAI.smartOfflineFoodEstimation(
        this.capturedImageUrl || '', 
        this.currentMealType, 
        userNotes
      );
      this.populateModal(fallback);
      if (this.btnAnalyzeNotes) this.btnAnalyzeNotes.disabled = false;
      if (this.btnAnalyzeNotesIcon) this.btnAnalyzeNotesIcon.textContent = '🔄';
      if (this.btnAnalyzeNotesText) this.btnAnalyzeNotesText.textContent = 'إعادة المحاولة بالملاحظات';
      window.AppedietApp?.showToast('تم تقدير السعرات بناءً على مكوناتك المسجلة ✨');
    }
  }

  populateModal(data) {
    this.currentFoodData = data;
    this.currentQuantity = data.quantity || 1;
    this.capturedImageUrl = data.imageUrl || '';

    // Store base per-unit data
    this.basePerUnitData = {
      calories: data.calories / this.currentQuantity,
      carb_g: data.carb_g / this.currentQuantity,
      protein_g: data.protein_g / this.currentQuantity,
      fat_g: data.fat_g / this.currentQuantity,
      fiber_g: (data.fiber_g || 0) / this.currentQuantity,
      sugar_g: (data.sugar_g || 0) / this.currentQuantity,
      sodium_mg: (data.sodium_mg || 0) / this.currentQuantity
    };

    if (this.photoPreview) {
      const placeholder = document.getElementById('food-photo-placeholder');
      if (data.imageUrl) {
        this.photoPreview.src = data.imageUrl;
        this.photoPreview.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
      } else {
        this.photoPreview.removeAttribute('src');
        this.photoPreview.style.display = 'none';
        if (placeholder) placeholder.style.display = 'flex';
      }
    }

    const displayName = data.food_name_ar || data.food_name || 'وجبة طعام';
    this.foodNameEl.textContent = displayName;
    this.quantityCountEl.textContent = this.currentQuantity;
    this.updateDisplayedNutrients();

    // Food list chips
    if (this.foodListContainer) {
      this.foodListContainer.innerHTML = `
        <div class="food-item-chip-card">
          <span class="food-item-chip-name">${displayName}</span>
          <span class="food-item-chip-kcal">${Math.round(data.calories)} kcal</span>
          <span class="food-item-chip-serv">${data.serving_size_ar || data.serving_size || '1 حصة'}</span>
        </div>
        <div class="food-item-chip-add" id="btn-chip-add-item">
          <span style="font-size: 18px;">+</span>
          <span>Add</span>
        </div>
      `;
      document.getElementById('btn-chip-add-item')?.addEventListener('click', () => {
        const item = prompt('أدخل اسم صنف إضافي:');
        if (item) {
          window.AppedietApp?.showToast(`تمت إضافة ${item} إلى قائمة الوجبة`);
        }
      });
    }

    // Insights content
    if (data.insights) {
      if (this.insightWhatsGood) this.insightWhatsGood.textContent = data.insights.what_is_good || 'خالٍ من السعرات والدهون، يرفع معدل الحرق.';
      if (this.insightWhatToImprove) this.insightWhatToImprove.textContent = data.insights.what_to_improve || 'تجنب إضافة السكريات أو الكريمة عالية الدهون.';
      if (this.insightWhatToEatNext) this.insightWhatToEatNext.textContent = data.insights.what_to_eat_next || 'أضف سناك بروتيني متوازن لدعم البناء العضلي.';
    }

    // Reset insights expander
    this.insightsUnlocked = false;
    this.insightsExpandedBox?.classList.add('hidden');
    if (this.btnUnlockInsights) {
      this.btnUnlockInsights.textContent = 'View Once for Free';
      this.btnUnlockInsights.style.backgroundColor = '#252c3d';
    }
  }

  updateQuantity(newQty) {
    if (newQty < 1) return;
    this.currentQuantity = newQty;
    this.quantityCountEl.textContent = this.currentQuantity;
    this.updateDisplayedNutrients();
  }

  updateDisplayedNutrients() {
    if (!this.basePerUnitData) return;
    const q = this.currentQuantity;

    const cal = Math.round(this.basePerUnitData.calories * q);
    const carb = Math.round((this.basePerUnitData.carb_g * q) * 10) / 10;
    const pro = Math.round((this.basePerUnitData.protein_g * q) * 10) / 10;
    const fat = Math.round((this.basePerUnitData.fat_g * q) * 10) / 10;

    this.caloriesValEl.textContent = cal;
    this.carbValEl.textContent = `${carb} g`;
    this.proteinValEl.textContent = `${pro} g`;
    this.fatValEl.textContent = `${fat} g`;

    if (this.fiberValEl) this.fiberValEl.textContent = `${Math.round(this.basePerUnitData.fiber_g * q)} g`;
    if (this.sugarValEl) this.sugarValEl.textContent = `${Math.round(this.basePerUnitData.sugar_g * q)} g`;
    if (this.sodiumValEl) this.sodiumValEl.textContent = `${Math.round(this.basePerUnitData.sodium_mg * q)} mg`;
  }

  saveAndLogMeal() {
    if (!this.currentFoodData) return;

    const targetDate = this.editingDateStr || window.AppedietApp?.getSelectedDate() || new Date().toISOString().split('T')[0];
    const q = this.currentQuantity;

    const mealRecord = {
      name: this.foodNameEl.textContent,
      mealType: this.currentMealType,
      quantity: q,
      serving: this.currentFoodData.serving_size || '1 serving',
      calories: Math.round(this.basePerUnitData.calories * q),
      carb: Math.round(this.basePerUnitData.carb_g * q * 10) / 10,
      protein: Math.round(this.basePerUnitData.protein_g * q * 10) / 10,
      fat: Math.round(this.basePerUnitData.fat_g * q * 10) / 10,
      imageUrl: this.capturedImageUrl,
      notes: this.notesInput?.value?.trim() || ''
    };

    if (this.editingMealId) {
      window.AppedietDB.updateMeal(targetDate, this.editingMealId, mealRecord);
      window.GoogleWorkspaceSync?.syncMeal(mealRecord, targetDate);
      window.AppedietApp?.showToast(`تم حفظ تعديل ${mealRecord.name} بنجاح! ✏️`);
    } else {
      window.AppedietDB.addMeal(targetDate, mealRecord);
      window.GoogleWorkspaceSync?.syncMeal(mealRecord, targetDate);
      window.AppedietApp?.showToast(`تم تسجيل ${mealRecord.name} في ${this.currentMealType} بنجاح! 🍽️`);
    }

    window.AppedietApp?.refreshDashboard();
    this.close();
  }

  close() {
    this.modal?.classList.remove('active');
    this.editingMealId = null;
    this.editingDateStr = null;
    this.btnDeleteMeal?.classList.add('hidden');
    if (this.logBtnText) {
      this.logBtnText.textContent = `Log to ${this.currentMealType}`;
    }
  }
}

window.NutritionScanner = NutritionScannerComponent;
