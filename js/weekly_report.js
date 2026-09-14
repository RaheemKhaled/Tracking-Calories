/**
 * Raheem Coach - Weekly Health & Nutrition Evaluation Report
 * Analyzes the past 7 days: classifies healthy vs junk food days,
 * calculates adherence score, and generates Coach Raheem's AI report.
 */

class WeeklyReportEngine {
  constructor() {
    this.junkKeywords = [
      'برجر', 'بيتزا', 'مقلي', 'بطاطس مقلية', 'شيبس', 'كولا', 'بيبسي', 'صودا', 
      'شيكولاتة', 'حلا', 'دونات', 'كيك', 'بسبوسة', 'كنافة', 'ماكدونالدز', 'كنتاكي',
      'اندومي', 'مشروب غازي', 'شاورما دسمة', 'سمن', 'سكر', 'شيبسي',
      'burger', 'pizza', 'fries', 'fried', 'soda', 'cake', 'donut', 'chocolate', 'chips', 'fast food'
    ];

    this.healthyKeywords = [
      'سلطة', 'مشوي', 'بيض', 'مسلوق', 'تونة', 'صدور دجاج', 'سمك', 'شوفان',
      'خضار', 'فواكه', 'تفاح', 'زبادي', 'يوناني', 'بروكلي', 'لحم بقري صافي', 'رز بني',
      'salad', 'grilled', 'boiled', 'egg', 'tuna', 'chicken breast', 'fish', 'oats', 'vegetable'
    ];
  }

  /**
   * Get list of last 7 date strings (YYYY-MM-DD)
   */
  getLast7Days(endDateStr) {
    const dates = [];
    const end = endDateStr ? new Date(endDateStr) : new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${day}`);
    }
    return dates;
  }

  /**
   * Classify a meal as Healthy, Junk/Harmful, or Neutral
   */
  classifyMeal(meal) {
    const text = ((meal.name || '') + ' ' + (meal.serving || '') + ' ' + (meal.notes || '')).toLowerCase();
    const cal = meal.calories || 0;
    const protein = meal.protein || 0;
    const fat = meal.fat || 0;
    const carb = meal.carb || 0;

    let isJunk = this.junkKeywords.some(k => text.includes(k.toLowerCase()));
    let isHealthy = this.healthyKeywords.some(k => text.includes(k.toLowerCase()));

    // Macro-based checks
    if (cal > 850 && fat > 40) isJunk = true;
    if (protein >= 25 && fat <= 20) isHealthy = true;

    if (isJunk && !isHealthy) {
      return { type: 'junk', label: 'أكل ضار / عالي الدسم', icon: '🔴', reason: 'سعرات وسكريات أو دهون مهدرجة عالية' };
    }
    if (isHealthy) {
      return { type: 'healthy', label: 'وجبة صحية ممتازة', icon: '🟢', reason: 'بروتين وألياف عالية تدعم النزول الصحي' };
    }
    return { type: 'neutral', label: 'وجبة متوازنة معتدلة', icon: '🟡', reason: 'ماكروز طبيعية ضمن الاحتياج' };
  }

  /**
   * Analyze 7-day logs
   */
  generateReportData(endDateStr) {
    const dates = this.getLast7Days(endDateStr);
    const profile = window.AppedietDB.getProfile();
    const calGoal = profile.calorieGoal || 1400;

    const daysOfWeekAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    const dayReports = [];
    let totalKcal = 0;
    let totalWaterGlasses = 0;
    let healthyMealsCount = 0;
    let junkMealsCount = 0;
    let totalMealsCount = 0;
    let daysOnTrackCount = 0;

    const junkMealsList = [];
    const healthyMealsList = [];

    dates.forEach(dateStr => {
      const log = window.AppedietDB.getDayLog(dateStr);
      const d = new Date(dateStr);
      const dayName = daysOfWeekAr[d.getDay()];

      let dayKcal = 0;
      let dayProtein = 0;
      let dayJunkCount = 0;
      let dayHealthyCount = 0;

      const meals = log.meals || [];
      meals.forEach(m => {
        totalMealsCount++;
        dayKcal += m.calories || 0;
        dayProtein += m.protein || 0;

        const classification = this.classifyMeal(m);
        m._classification = classification;

        if (classification.type === 'junk') {
          dayJunkCount++;
          junkMealsCount++;
          junkMealsList.push({ ...m, date: dateStr, dayName });
        } else if (classification.type === 'healthy') {
          dayHealthyCount++;
          healthyMealsCount++;
          healthyMealsList.push({ ...m, date: dateStr, dayName });
        }
      });

      totalKcal += dayKcal;
      totalWaterGlasses += (log.water || 0);

      // Day grade
      let dayGrade = 'neutral';
      let dayGradeLabel = 'متوسط';
      let dayGradeColor = '#eab308'; // yellow

      if (meals.length > 0) {
        if (dayJunkCount === 0 && dayKcal <= calGoal + 150 && (log.water || 0) >= 6) {
          dayGrade = 'good';
          dayGradeLabel = 'يوم صحي ممتاز 🟢';
          dayGradeColor = '#10b981';
          daysOnTrackCount++;
        } else if (dayJunkCount > 0 || dayKcal > calGoal + 300) {
          dayGrade = 'bad';
          dayGradeLabel = 'يوم به وجبات ضارة 🔴';
          dayGradeColor = '#ef4444';
        } else {
          dayGrade = 'fair';
          dayGradeLabel = 'يوم مقبول 🟡';
          dayGradeColor = '#f59e0b';
          daysOnTrackCount += 0.5;
        }
      } else {
        dayGradeLabel = 'لم يتم تسجيل وجبات ⚪';
        dayGradeColor = '#64748b';
      }

      dayReports.push({
        date: dateStr,
        dayName,
        calories: dayKcal,
        goal: calGoal,
        water: log.water || 0,
        mealsCount: meals.length,
        junkCount: dayJunkCount,
        healthyCount: dayHealthyCount,
        grade: dayGrade,
        gradeLabel: dayGradeLabel,
        gradeColor: dayGradeColor,
        meals
      });
    });

    // Calculate adherence score (0 - 100)
    const loggedDaysWithMeals = dayReports.filter(d => d.mealsCount > 0).length;
    let score = 75; // baseline
    if (loggedDaysWithMeals > 0) {
      const healthyRatio = totalMealsCount > 0 ? (healthyMealsCount / totalMealsCount) : 0.5;
      const junkPenalty = (junkMealsCount * 12);
      const adherenceRate = (daysOnTrackCount / Math.max(1, loggedDaysWithMeals));
      score = Math.round(Math.min(100, Math.max(30, (adherenceRate * 60) + (healthyRatio * 35) - junkPenalty + 15)));
    }

    let scoreRating = 'جيد جداً';
    let scoreBadge = 'B+';
    if (score >= 90) { scoreRating = 'ممتاز وملتزم كالبطل 🏆'; scoreBadge = 'A+'; }
    else if (score >= 80) { scoreRating = 'أداء رائع ومتقدم 🌟'; scoreBadge = 'A'; }
    else if (score >= 70) { scoreRating = 'جيد مع بعض التجاوزات ⚖️'; scoreBadge = 'B'; }
    else { scoreRating = 'بحاجة لمزيد من الانضباط والتركيز ⚠️'; scoreBadge = 'C'; }

    return {
      startDate: dates[0],
      endDate: dates[6],
      dayReports,
      totalKcal,
      avgKcal: Math.round(totalKcal / 7),
      calGoal,
      totalWaterGlasses,
      avgWaterGlasses: Math.round((totalWaterGlasses / 7) * 10) / 10,
      totalMealsCount,
      healthyMealsCount,
      junkMealsCount,
      daysOnTrackCount,
      score,
      scoreRating,
      scoreBadge,
      junkMealsList,
      healthyMealsList
    };
  }

  /**
   * Generate Coach Raheem AI Written Analysis & Actionable Advice
   */
  async generateAiNarrative(reportData) {
    const userName = window.AppedietDB.getUserAccount()?.name || 'صديقنا البطل';

    const junkSummary = reportData.junkMealsList.map(m => `- ${m.dayName} (${m.date}): ${m.name} (${m.calories} kcal)`).join('\n') || 'لا يوجد أي وجبات ضارة هذا الأسبوع! التزام نظيف 100%';
    const healthySummary = reportData.healthyMealsList.map(m => `- ${m.dayName}: ${m.name} (${m.protein}g بروتين)`).slice(0, 5).join('\n') || 'وجباتك المعتادة';

    const prompt = `
أنت "كوتش رحيم" (Raheem Coach) - مدرب التغذية واللياقة الشخصي المحترف والداعم.
حلل للمتدرب (${userName}) تقرير أسبوعه الغذائي بدقة وروح حماسية مشجعة بناءً على البيانات التالية:
- درجة الالتزام الأسبوعي: ${reportData.score}/100 (${reportData.scoreRating})
- متوسط السعرات اليومية: ${reportData.avgKcal} kcal مقابل الهدف المحدد ${reportData.calGoal} kcal
- متوسط شرب الماء: ${reportData.avgWaterGlasses} أكواب يومياً
- إجمالي الوجبات الصحية المسجلة: ${reportData.healthyMealsCount}
- إجمالي الوجبات الضارة/السريعة: ${reportData.junkMealsCount}

تفاصيل الأكل الضار المسجل خلال الأسبوع:
${junkSummary}

أبرز الوجبات الصحية الممتازة:
${healthySummary}

المطلوب إخراج التقرير باللغة العربية بتنسيق منظم وموجز يحتوي على:
1. 🟢 **تحليل الأيام الممتازة**: متى كان ملتزماً وممتازاً وماذا أكل بنجاح؟
2. 🔴 **تحليل الأيام والأطعمة الضارة**: متى ظهرت الوجبات غير الملتزمة وما أثرها وكيف نتفاداها؟
3. 💧 **تقييم شرب الماء**: هل حقق المستهدف أم يحتاج لزيادة الشرب؟
4. 🎯 **خطة كوتش رحيم للأسبوع القادم**: 3 نصائح ذهبية عملية للتطبيق الفوري.
اجعل الأسلوب محفزاً، شخصياً، وموجهاً للمتدرب مباشرة.
`;

    try {
      if (window.GeminiAI && window.GeminiAI.isConfigured()) {
        const text = await window.GeminiAI.generateText(prompt);
        if (text && text.trim().length > 100) {
          return text;
        }
      }
    } catch (e) {
      console.warn('Gemini report generation fallback:', e);
    }

    // Fallback smart algorithmic report
    return `
### 🟢 متى كنت رائعاً وممتازاً هذا الأسبوع؟
أحسنت في الأيام التي ركّزت فيها على البروتين الصافي والخضار؛ حيث سجلت **${reportData.healthyMealsCount} وجبات صحية** دعمت طاقتك وحافظت على عضلاتك وعززت حرق الدهون دون جوع مفاجئ.

### 🔴 متى ظهر الأكل الضار وما أثره؟
${reportData.junkMealsCount > 0 
  ? `تم رصد **${reportData.junkMealsCount} وجبة/عنصر ضار أو عالي السعرات** خلال الأسبوع (مثل: ${reportData.junkMealsList.map(m => m.name).slice(0, 2).join('، ')}). مثل هذه الوجبات ترفع مؤشر الإنسولين سريعاً وتسبب تخزين الدهون في منطقة البطن، والأهم أنها تقلل من عجز السعرات المطلوب لنزول الوزن.`
  : `ما شاء الله عليك يا بطل! لم يتم رصد أي وجبات سريعة أو ضارة تسحبك للخلف طوال الـ 7 أيام الماضية. هذا التزام احترافي يستحق الفخر!`}

### 💧 تقييم شرب الماء والترطيب:
معدلك الأسبوعي بلغ **${reportData.avgWaterGlasses} كوب يومياً** ${reportData.avgWaterGlasses >= 8 ? 'وهو ممتاز جداً للتمثيل الغذائي وحرق الدهون.' : 'ويفضل زيادته ليصل إلى 8 أكواب (أكثر من 2 لتر) يومياً لتحسين الهضم وتنشيط حرق السعرات.'}

### 🎯 خطة كوتش رحيم للأسبوع القادم:
1. **قاعدة الوجبة البديلة**: عند اشتهاء وجبة سريعة، تناول أولاً كوبين من الماء ومصدراً سريعاً للبروتين (مثل البيض أو الزبادي).
2. **الالتزام بنافذة التسجيل**: تابع تسجيل مياهك ووجباتك يومياً قبل الساعة 12 منتصف الليل لمراقبة التزامك لحظة بلحظة.
3. **التحضير المسبق**: جهز سناكاتك الصحية وأكواب الماء مسبقاً لتفادي الوقوع في الأكلات غير المخططة.
`;
  }
}

window.WeeklyReportEngine = new WeeklyReportEngine();
