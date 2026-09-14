/**
 * Raheem Coach - Exercise Engine & Diet Impact Analyzer
 * Calculates calories burned from exercises (Pushups, Squats, Running, etc.)
 * and computes their scientific impact on muscle recovery, protein needs, and diet goals.
 */

class ExerciseEngine {
  constructor() {
    this.library = {
      pushups: {
        id: 'pushups',
        name: 'Pushups (تمرين الضغط)',
        nameEn: 'Pushups',
        icon: '💪',
        category: 'bodyweight',
        inputMode: 'reps', // sets & reps
        defaultSets: 3,
        defaultReps: 15,
        baseCalPerRepPerKg: 0.0048, // ~0.45 kcal per rep for 95kg
        targetedMuscles: ['عضلات الصدر (Chest)', 'الترايسبس (Triceps)', 'الكتف الأمامي (Front Delts)', 'عضلات الكور والبطن (Core)'],
        dietImpactFn: (kcal, reps, weight) => ({
          proteinNeeded: '25 - 30 جم بروتين عالي الجودة',
          muscleTarget: 'الصدر والترايسبس والكتف',
          deficitBoostKcal: kcal,
          fatGramsBurned: Math.round((kcal / 7.7) * 10) / 10,
          postWorkoutMeal: 'وجبة غنية بالبروتين السريع (مثل: أومليت 3 بيضات مع توست بني، أو علبة تونة مصفاة، أو زبادي يوناني).',
          coachTip: 'تمرين الضغط يحمي عضلات الجزء العلوي من الهدم أثناء عجز السعرات، مما يضمن أن نزولك الـ 15 كجم يكون من دهون الصدر والبطن مباشرة.'
        })
      },
      pullups: {
        id: 'pullups',
        name: 'Pullups (تمرين العقلة)',
        nameEn: 'Pullups',
        icon: '🧗',
        category: 'bodyweight',
        inputMode: 'reps',
        defaultSets: 3,
        defaultReps: 8,
        baseCalPerRepPerKg: 0.0075,
        targetedMuscles: ['عضلات الظهر العريضة (Lats)', 'البايسبس (Biceps)', 'أعلى الظهر والكتف الخلفي', 'قوة الساعدين والقبضة'],
        dietImpactFn: (kcal, reps, weight) => ({
          proteinNeeded: '25 - 35 جم بروتين للاستشفاء',
          muscleTarget: 'عضلات الظهر المجنحة والبايسبس',
          deficitBoostKcal: kcal,
          fatGramsBurned: Math.round((kcal / 7.7) * 10) / 10,
          postWorkoutMeal: 'صدر دجاج مشوي مع أرز بني وسلطة خضراء لتعويض الجليكوجين العضلي.',
          coachTip: 'العقلة تمرين مركب قوي جداً؛ يمنح الظهر شكل V-taper ويشد الجسم العلوي تزامناً مع حرق الدهون.'
        })
      },
      squats: {
        id: 'squats',
        name: 'Bodyweight Squats (سكوات / قرفصاء)',
        nameEn: 'Squats',
        icon: '🦵',
        category: 'bodyweight',
        inputMode: 'reps',
        defaultSets: 3,
        defaultReps: 20,
        baseCalPerRepPerKg: 0.0055,
        targetedMuscles: ['الفخذ الأمامي (Quads)', 'عضلات المؤخرة (Glutes)', 'أوتار الركبة (Hamstrings)', 'عضلات البطن والحوض'],
        dietImpactFn: (kcal, reps, weight) => ({
          proteinNeeded: '30 جم بروتين للاستشفاء',
          muscleTarget: 'أكبر عضلات الجسم (الأفخاذ والأرداف)',
          deficitBoostKcal: kcal,
          fatGramsBurned: Math.round((kcal / 7.7) * 10) / 10,
          postWorkoutMeal: 'وجبة متكاملة (لحم بقري مفروم قليل الدسم أو فراخ مع بطاطس مسلوقة وسلطة).',
          coachTip: 'تشغيل عضلات الساقين الكبيرة يحفز إفراز هرمونات حرق الدهون ويزيد استهلاك الطاقة لساعات طويلة بعد التمرين.'
        })
      },
      running: {
        id: 'running',
        name: 'Running / Jogging (جري / هرولة)',
        nameEn: 'Running',
        icon: '🏃',
        category: 'cardio',
        inputMode: 'duration', // minutes
        defaultDuration: 20,
        metValue: 8.5, // MET
        targetedMuscles: ['الجهاز القلبي والرئوي', 'عضلات الساقين والأفخاذ', 'حرق الدهون العامة'],
        dietImpactFn: (kcal, mins, weight) => ({
          proteinNeeded: '20 جم بروتين + كارب سريع',
          muscleTarget: 'اللياقة القلبية وحرق دهون البطن والأحشاء',
          deficitBoostKcal: kcal,
          fatGramsBurned: Math.round((kcal / 7.7) * 10) / 10,
          postWorkoutMeal: 'موزة مع كوب حليب خالي الدسم أو سكوب واي بروتين مع شرب 500 مل ماء فوراً.',
          coachTip: 'حرق مباشر للسعرات يعزز عجزك اليومي بنجاح، احرص على عدم الإفراط في الأكل بعد الجري بحجة التعب.'
        })
      },
      walking: {
        id: 'walking',
        name: 'Brisk Walking (مشي سريع)',
        nameEn: 'Brisk Walking',
        icon: '🚶',
        category: 'cardio',
        inputMode: 'duration',
        defaultDuration: 30,
        metValue: 4.2,
        targetedMuscles: ['الساقين والسمانة', 'تنشيط الدورة الدموية', 'تخفيض مقاومة الإنسولين'],
        dietImpactFn: (kcal, mins, weight) => ({
          proteinNeeded: '15 - 20 جم بروتين ضمن وجباتك المعتادة',
          muscleTarget: 'النشاط اليومي وحرق السعرات النظيف',
          deficitBoostKcal: kcal,
          fatGramsBurned: Math.round((kcal / 7.7) * 10) / 10,
          postWorkoutMeal: 'كوب ماء بارد وسناك خفيف محسوب (مثل تفاحة مع 5 حبات لوز).',
          coachTip: 'المشي السريع هو السلاح السري للنزول السلس؛ يحرق دهوناً نقية دون زيادة هرمون الجوع (Ghrelin).'
        })
      },
      cycling: {
        id: 'cycling',
        name: 'Cycling (دراجة هوائية / ثابتة)',
        nameEn: 'Cycling',
        icon: '🚴',
        category: 'cardio',
        inputMode: 'duration',
        defaultDuration: 25,
        metValue: 6.8,
        targetedMuscles: ['الأفخاذ الأمامية والخلفية', 'السمانة', 'حرق الكارديو متوسط الشدة'],
        dietImpactFn: (kcal, mins, weight) => ({
          proteinNeeded: '20 جم بروتين',
          muscleTarget: 'الساقين والتحمل العضلي',
          deficitBoostKcal: kcal,
          fatGramsBurned: Math.round((kcal / 7.7) * 10) / 10,
          postWorkoutMeal: 'وجبة متوازنة من البروتين والخضار.',
          coachTip: 'يحرق سعرات ممتازة مع الحفاظ على سلامة الركب والمفاصل للأوزان العالية.'
        })
      },
      plank: {
        id: 'plank',
        name: 'Plank (تمرين البلانك / بطن)',
        nameEn: 'Plank',
        icon: '🧘',
        category: 'bodyweight',
        inputMode: 'duration',
        defaultDuration: 3, // minutes total
        metValue: 3.8,
        targetedMuscles: ['عضلات البطن العميقة (Transverse Abdominis)', 'الكور وأسفل الظهر', 'شد البطن المترهل'],
        dietImpactFn: (kcal, mins, weight) => ({
          proteinNeeded: '20 جم بروتين لترميم الألياف',
          muscleTarget: 'جدار البطن الحشوي والخواصر',
          deficitBoostKcal: kcal,
          fatGramsBurned: Math.round((kcal / 7.7) * 10) / 10,
          postWorkoutMeal: 'اشرب كوبين ماء وابتعد عن النشويات البسيطة لتقليل الانتفاخ.',
          coachTip: 'البلانك يشد محيط الخصر ويقلل مقاسه بالسنتيمترات بشكل ملحوظ خلال أسابيع.'
        })
      },
      jump_rope: {
        id: 'jump_rope',
        name: 'Jump Rope (نط الحبل)',
        nameEn: 'Jump Rope',
        icon: '🪢',
        category: 'cardio',
        inputMode: 'duration',
        defaultDuration: 15,
        metValue: 10.5,
        targetedMuscles: ['كامل الجسم', 'السمانة والأفخاذ', 'الكتف والساعدين'],
        dietImpactFn: (kcal, mins, weight) => ({
          proteinNeeded: '25 جم بروتين',
          muscleTarget: 'حرق عالي الشدة HIIT لدهون الجسم الصعبة',
          deficitBoostKcal: kcal,
          fatGramsBurned: Math.round((kcal / 7.7) * 10) / 10,
          postWorkoutMeal: 'وجبة استشفاء كاملة مع تعويض أملاح البوتاسيوم والصوديوم بالماء.',
          coachTip: '10 دقائق من نط الحبل تعادل 30 دقيقة جري في حرق السعرات وتفجير الدهون.'
        })
      },
      gym_weights: {
        id: 'gym_weights',
        name: 'Weight Lifting (تمارين الحديد والجيم)',
        nameEn: 'Gym Weight Lifting',
        icon: '🏋️',
        category: 'strength',
        inputMode: 'duration',
        defaultDuration: 45,
        metValue: 6.0,
        targetedMuscles: ['عضلات الجسم المستهدفة في اليوم (صدر، ظهر، أرجل، كتف)', 'رفع القوة العضلية'],
        dietImpactFn: (kcal, mins, weight) => ({
          proteinNeeded: '30 - 40 جم بروتين عالي الامتصاص',
          muscleTarget: 'البناء العضلي وزيادة الأيض القاعدي (BMR)',
          deficitBoostKcal: kcal,
          fatGramsBurned: Math.round((kcal / 7.7) * 10) / 10,
          postWorkoutMeal: 'وجبة متكاملة: 200 جم صدور دجاج أو سمك + 150 جم أرز + سلطة ملونة.',
          coachTip: 'كل كيلو عضلات تبنيه يزيد من حرق جسمك التلقائي للدهون طوال اليوم حتى أثناء النوم.'
        })
      }
    };
  }

  /**
   * Get list of all available standard exercises
   */
  getAvailableExercises() {
    return Object.values(this.library);
  }

  /**
   * Calculate calories burned and diet impact for a specific exercise
   */
  calculateExercise(exerciseId, inputVal, userWeight = 95) {
    const ex = this.library[exerciseId];
    if (!ex) return null;

    let burnedKcal = 0;
    const qty = Math.max(1, parseFloat(inputVal) || 1);

    if (ex.inputMode === 'reps') {
      // Reps based calculation: qty = total reps
      burnedKcal = Math.round(qty * userWeight * ex.baseCalPerRepPerKg);
      // Ensure reasonable minimum for resistance effort
      burnedKcal = Math.max(15, burnedKcal);
    } else {
      // Duration based (minutes): MET formula -> kcal = MET * weight (kg) * (durationMin / 60)
      const durationHours = qty / 60;
      burnedKcal = Math.round(ex.metValue * userWeight * durationHours);
    }

    const impact = ex.dietImpactFn(burnedKcal, qty, userWeight);

    return {
      exerciseId: ex.id,
      name: ex.name,
      icon: ex.icon,
      category: ex.category,
      inputMode: ex.inputMode,
      quantity: qty,
      unitLabel: ex.inputMode === 'reps' ? 'عدة (Reps)' : 'دقيقة (Mins)',
      burnedKcal,
      targetedMuscles: ex.targetedMuscles,
      impact
    };
  }

  /**
   * Analyze custom exercise entered in free text by user (e.g. "لعبت كرة قدم ساعة" or "تمرين بطن وضغط")
   */
  async analyzeCustomExercise(exerciseText, userWeight = 95) {
    const text = (exerciseText || '').trim();
    if (!text) return null;

    // Check if it closely matches any library exercise
    const lower = text.toLowerCase();
    for (const key of Object.keys(this.library)) {
      const ex = this.library[key];
      if (lower.includes(ex.id) || lower.includes(ex.nameEn.toLowerCase()) || text.includes(ex.name)) {
        return this.calculateExercise(key, ex.inputMode === 'reps' ? (ex.defaultSets * ex.defaultReps) : ex.defaultDuration, userWeight);
      }
    }

    // Try AI analysis with Gemini
    const prompt = `
أنت "كوتش رحيم" (Raheem Coach) - خبير اللياقة البدنية والتمارين والتغذية الرياضية.
قام المتدرب بإدخال النشاط الرياضي التالي: "${text}"
وزن المتدرب الحالي: ${userWeight} كجم.

المطلوب: تحليل هذا التمرين وتقدير السعرات المحروقة وأثره المباشر على الدايت ونزول الوزن بدقة.
أخرج النتيجة بصيغة JSON نظيفة تماماً بالشكل التالي:
{
  "name": "اسم التمرين بالعربية (مثال: كرة قدم ترفيهية / تمارين حرة)",
  "icon": "أيقونة تعبيرية مناسبة (مثال: ⚽ أو 🏃 أو 🏋️)",
  "quantity": 30,
  "unitLabel": "دقيقة أو عدة",
  "burnedKcal": 220,
  "targetedMuscles": ["عضلة 1", "عضلة 2", "عضلة 3"],
  "impact": {
    "proteinNeeded": "احتياج البروتين للاستشفاء (مثال: 25 جم بروتين)",
    "muscleTarget": "العضلات المستفيدة",
    "deficitBoostKcal": 220,
    "fatGramsBurned": 28.5,
    "postWorkoutMeal": "وجبة مقترحة بعد هذا التمرين لدعم الدايت",
    "coachTip": "نصيحة ذهبية من كوتش رحيم عن أثر هذا التمرين على حرق دهون البطن والهدف"
  }
}
`;

    try {
      if (window.GeminiAI && window.GeminiAI.isConfigured()) {
        const aiResponse = await window.GeminiAI.generateText(prompt);
        if (aiResponse) {
          const cleanJson = aiResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          return {
            exerciseId: 'custom_' + Date.now(),
            name: parsed.name || text,
            icon: parsed.icon || '⚡',
            category: 'custom',
            inputMode: parsed.unitLabel?.includes('دقيقة') ? 'duration' : 'reps',
            quantity: parsed.quantity || 30,
            unitLabel: parsed.unitLabel || 'دقيقة',
            burnedKcal: parsed.burnedKcal || 180,
            targetedMuscles: parsed.targetedMuscles || ['كامل الجسم'],
            impact: parsed.impact || {
              proteinNeeded: '20-25 جم بروتين',
              muscleTarget: 'تنشيط الحرق العام',
              deficitBoostKcal: parsed.burnedKcal || 180,
              fatGramsBurned: Math.round(((parsed.burnedKcal || 180) / 7.7) * 10) / 10,
              postWorkoutMeal: 'وجبة صحية متوازنة مع شرب ماء كافٍ.',
              coachTip: 'أي حركة إضافية تعزز عجز السعرات وتقربك من هدف الـ 80 كجم.'
            }
          };
        }
      }
    } catch (err) {
      console.warn('AI custom exercise analysis fallback:', err);
    }

    // Smart fallback calculation
    const fallbackKcal = Math.round(5.5 * userWeight * (30 / 60)); // ~260 kcal for 30 min moderate activity
    return {
      exerciseId: 'custom_' + Date.now(),
      name: text,
      icon: '⚡',
      category: 'custom',
      inputMode: 'duration',
      quantity: 30,
      unitLabel: 'دقيقة',
      burnedKcal: fallbackKcal,
      targetedMuscles: ['عضلات الجسم العامة', 'الجهاز الدوري التنفسي'],
      impact: {
        proteinNeeded: '20 - 25 جم بروتين',
        muscleTarget: 'اللياقة العامة وحرق السعرات',
        deficitBoostKcal: fallbackKcal,
        fatGramsBurned: Math.round((fallbackKcal / 7.7) * 10) / 10,
        postWorkoutMeal: 'وجبة متوازنة عالية البروتين مع شرب كوبين ماء لتعويض العرق.',
        coachTip: 'أحسنت على هذا المجهود؛ أضفت عجزاً قدره ' + fallbackKcal + ' سعر حراري لليوم مما يسرع نزول دهونك.'
      }
    };
  }
}

window.ExerciseEngine = new ExerciseEngine();
