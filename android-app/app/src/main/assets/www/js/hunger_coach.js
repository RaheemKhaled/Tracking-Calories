/**
 * Appediet AI Hunger & Nutrition Coach ("Ask Appediet")
 * Guides the user when feeling hungry, evaluates remaining macros, and provides smart food choices.
 */

class HungerCoachComponent {
  constructor() {
    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.modal = document.getElementById('ask-appediet-modal');
    this.chatHistory = document.getElementById('coach-chat-history');
    this.inputField = document.getElementById('coach-user-input');
    this.sendBtn = document.getElementById('btn-send-coach-msg');
    this.btnHungerEmergency = document.getElementById('btn-hunger-emergency');
  }

  bindEvents() {
    // Open modal via header Ask Appediet button
    document.getElementById('btn-header-ask-appediet')?.addEventListener('click', () => this.open());

    // Close modal
    document.getElementById('btn-close-coach-modal')?.addEventListener('click', () => this.close());

    // Send button
    this.sendBtn?.addEventListener('click', () => this.handleUserSend());

    // Enter key
    this.inputField?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleUserSend();
    });

    // Quick Hunger Emergency button
    this.btnHungerEmergency?.addEventListener('click', () => this.handleHungerCrisis());

    // Quick suggestions chips
    document.querySelectorAll('.coach-quick-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const text = chip.getAttribute('data-prompt');
        if (text) {
          this.inputField.value = text;
          this.handleUserSend();
        }
      });
    });
  }

  open() {
    this.modal?.classList.add('active');
    // If chat is empty, welcome the user with status
    if (this.chatHistory && this.chatHistory.children.length <= 1) {
      this.sendWelcomeMessage();
    }
  }

  close() {
    this.modal?.classList.remove('active');
  }

  sendWelcomeMessage() {
    const profile = window.AppedietDB.getProfile();
    const selectedDate = window.AppedietApp?.getSelectedDate() || new Date().toISOString().split('T')[0];
    const dayData = window.AppedietDB.getDayLog(selectedDate);

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

    const remainingKcal = Math.max(0, (profile.calorieGoal || 1400) - eatenKcal);

    const welcomeHtml = `
      <p>أهلاً بك! أنا <strong>كوتش رحيم (Raheem Coach) الذكي</strong> 🥗</p>
      <p style="margin-top: 6px;">ميزانيتك المتبقية لليوم هي <strong>${remainingKcal} سعرة حرارية</strong>. إذا كنت تشعر بالجوع الآن، اضغط على زر الطوارئ بالأسفل أو اسألني عن أي خيار غذائي وسأرشدك للأنسب فوراً!</p>
    `;
    this.appendAiMessage(welcomeHtml);
  }

  handleHungerCrisis() {
    this.appendUserMessage('🚨 أنا جعان جداً دلوقتي ومحتار.. آكل إيه عشان ما أبوظش الدايت؟');

    const profile = window.AppedietDB.getProfile();
    const selectedDate = window.AppedietApp?.getSelectedDate() || new Date().toISOString().split('T')[0];
    const dayData = window.AppedietDB.getDayLog(selectedDate);

    let eatenKcal = 0;
    let eatenProtein = 0;
    (dayData.meals || []).forEach(m => {
      eatenKcal += m.calories || 0;
      eatenProtein += m.protein || 0;
    });

    const remainingKcal = Math.max(0, (profile.calorieGoal || 1400) - eatenKcal);
    const remainingProtein = Math.max(0, (profile.proteinGoal || 88) - eatenProtein);

    let responseHtml = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <p><strong>لا تقلق! إليك خطة الإنقاذ الذكية بناءً على وضعك الحالي (متبقي لديك ${remainingKcal} kcal):</strong></p>
        
        <div style="background:rgba(255,255,255,0.06); padding:10px; border-radius:10px; border-right:3px solid #38bdf8;">
          <h4 style="color:#38bdf8; font-size:13px; margin-bottom:4px;">1️⃣ خطوة العطش والجوع النفسي (دقيقتين)</h4>
          <p style="font-size:12px; color:#cbd5e1;">الدماغ كثيراً ما يخلط بين إشارة العطش والجوع. اشرب كوب ماء بارد كبير فوراً وانتظر 5 دقائق، 40% من نوبات الجوع تختفي هنا.</p>
        </div>

        <div style="background:rgba(255,255,255,0.06); padding:10px; border-radius:10px; border-right:3px solid #10b981;">
          <h4 style="color:#10b981; font-size:13px; margin-bottom:4px;">2️⃣ خيارات الشبع الضخم (Volume Eating - أقل من 70 سعرة)</h4>
          <ul style="font-size:12px; color:#cbd5e1; padding-right:16px; margin:0;">
            <li>طبق خيار وجزر مقرمش مع عصير ليمون ورشة ملح خفيفة.</li>
            <li>كوب شوربة خضار مصفاة ساخنة تعطي امتلاءً فورياً للمعدة.</li>
            <li>كوب فشار مطهو بالهواء (بدون زيت) يعطيك حجم ومضغ يشبع الدماغ.</li>
          </ul>
        </div>

        <div style="background:rgba(255,255,255,0.06); padding:10px; border-radius:10px; border-right:3px solid #f59e0b;">
          <h4 style="color:#f59e0b; font-size:13px; margin-bottom:4px;">3️⃣ خيارات القضاء على هرمون الجوع (High Protein)</h4>
          <p style="font-size:12px; color:#cbd5e1;">متبقي لك ${Math.round(remainingProtein)} جم بروتين اليوم. تناول أحد هذه الخيارات:</p>
          <ul style="font-size:12px; color:#cbd5e1; padding-right:16px; margin:0;">
            <li>علبة زبادي يوناني قليل الدسم (15 جم بروتين - 90 سعرة فقط).</li>
            <li>بيضتان مسلوقتان مع رشة كمون (12 جم بروتين - 140 سعرة).</li>
            <li>100 جم جبن قريش مع نصف ملعقة زيت زيتون وخيار.</li>
          </ul>
        </div>
      </div>
    `;

    setTimeout(() => {
      this.appendAiMessage(responseHtml);
    }, 400);
  }

  async handleUserSend() {
    const text = (this.inputField.value || '').trim();
    if (!text) return;

    this.appendUserMessage(text);
    this.inputField.value = '';

    // Show typing placeholder
    const loadingId = this.appendAiMessage('يكتب الآن... ⏳');

    const profile = window.AppedietDB.getProfile();
    const selectedDate = window.AppedietApp?.getSelectedDate() || new Date().toISOString().split('T')[0];
    const dayData = window.AppedietDB.getDayLog(selectedDate);

    // Call Gemini or smart fallback
    const answer = await this.generateCoachAnswer(text, profile, dayData);
    this.updateAiMessage(loadingId, answer);
  }

  async generateCoachAnswer(userPrompt, profile, dayData) {
    const apiKey = window.AppedietDB.getSettings().gemini_api_key;

    if (apiKey && apiKey.length > 15) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const sysPrompt = `أنت "كوتش رحيم" (Raheem Coach) خبير التغذية واللياقة الشخصي الذكي في تطبيق Raheem Coach.
معلومات المستخدم:
- الوزن الحالي: ${profile.currentWeight} كجم، الطول: ${profile.height} سم، الوزن المستهدف: ${profile.goalWeight} كجم.
- ميزانية السعرات اليومية: ${profile.calorieGoal} kcal.
- الماكروز المستهدفة: بروتين ${profile.proteinGoal}g، كارب ${profile.carbGoal}g، دهون ${profile.fatGoal}g.
المطلوب: أجب كمدرب محترف وداعم (كوتش رحيم) بلباقة ولغة عربية مشجعة وموجزة وواقعية جداً على سؤال المستخدم، وقدم حلولاً عملية للشبع ومحاربة الجوع بدون تخريب خطة نزول الوزن.`;

        const payload = {
          contents: [{
            parts: [
              { text: sysPrompt },
              { text: `سؤال المستخدم: ${userPrompt}` }
            ]
          }]
        };

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const json = await res.json();
          return json.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } catch (e) {
        console.warn('Gemini chat error, fallback to rules engine:', e);
      }
    }

    // Heuristic Smart Responses
    const lower = userPrompt.toLowerCase();
    if (lower.includes('حلو') || lower.includes('سكر') || lower.includes('شوكولاتة')) {
      return `لإشباع رغبة الحلويات بدون زيادة الوزن:\n1. موزة مجمدة مخفوقة مع ملعقة كاكاو خام (آيس كريم صحي 90 سعرة).\n2. تمرتان مع ملعقة صغيرة زبدة فول سوداني ورشة قرفة.\n3. زبادي يوناني بنكهة الفانيليا مع قطرات محلي ستيفيا وحفنة توت.`;
    } else if (lower.includes('عشاء') || lower.includes('بالليل')) {
      return `أفضل عشاء يساعدك على النوم الخفيف وحرق الدهون:\n- أومليت بيض بالخضار (سبانخ وفلفل ألوان) مع ربع رغيف بلدي.\n- أو علبة تونة مصفاة من الزيت مع سلطة خضراء وعصير ليمون.\nتجنب النشويات البسيطة في وقت متأخر لتفادي ارتفاع الأنسولين أثناء النوم.`;
    } else if (lower.includes('برة') || lower.includes('مطعم') || lower.includes('عزومة')) {
      return `نصائح الأكل في المطاعم والعزومات:\n1. ابدأ دائماً بشوربة صافية أو طبق سلطة كبير.\n2. اختر المشويات (صدر دجاج مشوي، سمك مشوي، لحم ستيك بدون دهون).\n3. اطلب الصوصات والسلطات المتبلة على جنب (On the side) لتتحكم في كمية الزيت.\n4. اشرب كوبين ماء قبل الوجبة بـ 15 دقيقة.`;
    } else {
      return `للمحافظة على خطتك والوصول لوزنك المستهدف (${profile.goalWeight} كجم):\nركز على 3 قواعد ذهبية: البروتين أولاً في كل وجبة للشبع، شرب 2-3 لتر ماء يومياً، وتناول الخضروات الورقية لملء المعدة بالألياف. إذا كنت تشعر بالجوع الآن، تناول مصدراً بروتينياً سريعاً كبيضة مسلوقة أو زبادي يوناني.`;
    }
  }

  appendUserMessage(text) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble user';
    bubble.textContent = text;
    this.chatHistory.appendChild(bubble);
    this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
  }

  appendAiMessage(html) {
    const id = 'msg_' + Date.now();
    const bubble = document.createElement('div');
    bubble.id = id;
    bubble.className = 'chat-bubble ai';
    bubble.innerHTML = html;
    this.chatHistory.appendChild(bubble);
    this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    return id;
  }

  updateAiMessage(id, textOrHtml) {
    const bubble = document.getElementById(id);
    if (bubble) {
      bubble.innerHTML = textOrHtml.replace(/\n/g, '<br>');
      this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    }
  }
}

window.HungerCoach = HungerCoachComponent;
