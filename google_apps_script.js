/**
 * ==============================================================================
 * 🌟 كود الربط السحابي مع جوجل شيتس (Google Workspace Database Script)
 * تطبيق Raheem Coach
 * ==============================================================================
 * 
 * 📋 خطوات التفعيل في 60 ثانية:
 * 1. افتح حساب جوجل الخاص بك، وأنشئ جدول بيانات جديد في Google Sheets باسم: "Raheem Coach Database".
 * 2. من القائمة العلوية اضغط على: Extensions (الإضافات) > Apps Script.
 * 3. امسح أي كود موجود هناك، والصق هذا الكود بالكامل مكانه.
 * 4. اضغط على زر Deploy (نشر) الأزرق بالأعلى > اختر New deployment (نشر جديد).
 * 5. اضغط على علامة الترس بجانب Select type واختر Web app (تطبيق ويب).
 * 6. اضبط الإعدادات كالتالي:
 *    - Description: Raheem Coach DB
 *    - Execute as: Me (حسابك)
 *    - Who has access: Anyone (أي شخص - لكي يتمكن التطبيق من الإرسال للشيت)
 * 7. اضغط Deploy ووافق على الصلاحيات (Authorize Access).
 * 8. انسخ الرابط الذي سينتهي بـ "/exec" وضعه داخل إعدادات تطبيق Raheem Coach (زر التاج 👑).
 * 
 * مبروك! أصبحت كل وجبة، كالوري، كوب ماء، وقياسات جسم تُحفظ تلقائياً في شيت جوجل للأبد!
 * ==============================================================================
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    // 1. تسجيل وجبة طعام ومغذياتها
    if (action === "log_meal") {
      var mealsSheet = sheet.getSheetByName("الوجبات (Meals)") || sheet.insertSheet("الوجبات (Meals)");
      if (mealsSheet.getLastRow() === 0) {
        mealsSheet.appendRow([
          "وقت التسجيل", "المستخدم", "البريد الإلكتروني", "التاريخ", "نوع الوجبة", "اسم الصنف", "الكمية", 
          "السعرات (kcal)", "البروتين (جم)", "الكارب (جم)", "الدهون (جم)", 
          "الألياف (جم)", "الصوديوم (ملجم)", "رؤى الذكاء الاصطناعي"
        ]);
        mealsSheet.getRange(1, 1, 1, 14).setBackground("#1e293b").setFontColor("#ffffff").setFontWeight("bold");
      }
      mealsSheet.appendRow([
        new Date(), data.userName || "مستخدم Raheem Coach", data.userEmail || "user@raheemcoach.app",
        data.date, data.mealType, data.foodName, data.servings,
        data.calories, data.protein, data.carbs, data.fat,
        data.fiber, data.sodium, data.insights
      ]);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Meal logged" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 2. تسجيل قياسات الجسم ونسبة الدهون
    if (action === "log_body") {
      var bodySheet = sheet.getSheetByName("قياسات الجسم (Body)") || sheet.insertSheet("قياسات الجسم (Body)");
      if (bodySheet.getLastRow() === 0) {
        bodySheet.appendRow([
          "وقت التسجيل", "التاريخ", "الوزن (كجم)", "الطول (سم)", "الهدف (كجم)", 
          "الخصر (سم)", "الرقبة (سم)", "الحوض (سم)", "الصدر (سم)", 
          "نسبة الدهون %", "كتلة الدهون (كجم)", "الكتلة العضلية (كجم)", "BMI"
        ]);
        bodySheet.getRange(1, 1, 1, 13).setBackground("#0f172a").setFontColor("#38bdf8").setFontWeight("bold");
      }
      bodySheet.appendRow([
        new Date(), data.date, data.weight, data.height, data.goalWeight,
        data.waist, data.neck, data.hip, data.chest,
        data.bodyFatPct, data.fatMassKg, data.leanMassKg, data.bmi
      ]);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Body logged" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 3. تسجيل الماء والعادات
    if (action === "log_water") {
      var habitSheet = sheet.getSheetByName("الماء والنشاط (Daily)") || sheet.insertSheet("الماء والنشاط (Daily)");
      if (habitSheet.getLastRow() === 0) {
        habitSheet.appendRow(["وقت التسجيل", "التاريخ", "شرب الماء (fl oz)", "السعرات المحروقة (kcal)", "المزاج الشعوري"]);
        habitSheet.getRange(1, 1, 1, 5).setBackground("#1e293b").setFontColor("#34d399").setFontWeight("bold");
      }
      habitSheet.appendRow([new Date(), data.date, data.water, data.burned, data.mood]);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Habits logged" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 4. نسخ احتياطي شامل لكافة البيانات
    if (action === "sync_all") {
      var backupSheet = sheet.getSheetByName("نسخة احتياطية (Backup)") || sheet.insertSheet("نسخة احتياطية (Backup)");
      backupSheet.clear();
      backupSheet.appendRow(["تاريخ وتوقيت النسخ الاحتياطي", "بيانات الحساب الكاملة (JSON)"]);
      backupSheet.getRange(1, 1, 1, 2).setBackground("#312e81").setFontColor("#ffffff").setFontWeight("bold");
      backupSheet.appendRow([new Date(), JSON.stringify(data.payload)]);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Full backup saved" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "ignored", reason: "Unknown action" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("✅ Raheem Coach Google Sheets Database Webhook is Online and Ready!")
    .setMimeType(ContentService.MimeType.TEXT);
}
