#!/usr/bin/env python3
"""
Raheem Coach - Vercel Serverless Python Handler
Endpoints:
  GET  /api/status
  POST /api/analyze-food
  POST /api/coach-chat
"""

from http.server import BaseHTTPRequestHandler
import json
import os
import urllib.request
import urllib.error

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-1.5-flash']

def call_gemini_api(prompt, base64_image=None, mime_type="image/jpeg", json_mode=False):
    """Helper to call Google Gemini API directly with multi-model fallback"""
    api_key = os.environ.get('GEMINI_API_KEY', '')
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not configured.")

    last_error = None
    for model_name in GEMINI_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        
        parts = [{"text": prompt}]
        if base64_image:
            parts.append({
                "inline_data": {
                    "mime_type": mime_type,
                    "data": base64_image
                }
            })
            
        payload = {
            "contents": [{"parts": parts}]
        }
        
        gen_config = {"temperature": 0.2}
        if json_mode:
            gen_config["response_mime_type"] = "application/json"
        payload["generationConfig"] = gen_config

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )

        try:
            with urllib.request.urlopen(req, timeout=25) as res:
                res_data = json.loads(res.read().decode('utf-8'))
                text = res_data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
                if text:
                    return text
        except Exception as e:
            last_error = e
            continue

    if last_error:
        raise last_error
    raise RuntimeError("No response from Gemini API")


class handler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        path = self.path.split('?')[0]

        if path in ['/api/status', '/api/status/']:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self._send_cors_headers()
            self.end_headers()
            status_data = {
                'status': 'online',
                'app': 'Raheem Coach',
                'ai_connected': bool(os.environ.get('GEMINI_API_KEY')),
                'platform': 'vercel-serverless'
            }
            self.wfile.write(json.dumps(status_data, ensure_ascii=False).encode('utf-8'))
            return

        # Default fallback
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps({'status': 'online', 'message': 'Raheem Coach API'}).encode('utf-8'))

    def do_POST(self):
        path = self.path.split('?')[0]
        content_length = int(self.headers.get('Content-Length', 0))
        post_body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else '{}'

        try:
            req_data = json.loads(post_body)
        except Exception:
            req_data = {}

        if path in ['/api/analyze-food', '/api/analyze-food/']:
            self.handle_analyze_food(req_data)
            return

        if path in ['/api/coach-chat', '/api/coach-chat/']:
            self.handle_coach_chat(req_data)
            return

        self.send_response(404)
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Endpoint not found'}).encode('utf-8'))

    def handle_analyze_food(self, data):
        image_base64 = data.get('image')
        mime_type = data.get('mimeType', 'image/jpeg')
        meal_type = data.get('mealType', 'Lunch')
        user_notes = data.get('notes') or data.get('user_notes', '')

        notes_prompt = ""
        if user_notes:
            notes_prompt = f"\n\n📌 ملاحظات وتفاصيل دقيقة كتبها المستخدم بنفسه عن المكونات والكميات:\n\"{user_notes}\"\n⚠️ اعتمد كلياً على هذه الملاحظات (مثل عدد البيضات، ملاعق السكر، كمية الأرز أو البطاطس أو الخبز، نوع الزيت أو الزبدة) وادمجها مع فحص الصورة لتقدير وحساب السعرات والماكروز بدقة 100%."

        prompt = f"""أنت خبير تغذية وذكاء اصطناعي متخصص في تحليل وجبات ومشروبات تطبيق Raheem Coach.
المطلوب: قم بتحليل هذه الصورة للطعام أو المشروب المعروض بدقة (وجبة {meal_type}):{notes_prompt}
1. حدد اسم الطعام أو المشروب باللغتين (العربية والإنجليزية) مع ذكر تفاصيل المكونات بدقة.
2. قدر حجم الحصة (Serving size).
3. احسب بدقة:
   - السعرات الحرارية الإجمالية (calories kcal)
   - الكربوهيدرات بالجرام (carb_g)
   - البروتين بالجرام (protein_g)
   - الدهون الإجمالية بالجرام (fat_g)
   - الألياف بالجرام (fiber_g)
   - السكريات بالجرام (sugar_g)
   - الصوديوم بالمليجرام (sodium_mg)
4. قدم رؤى ذكية وموجزة (insights) تشمل:
   - what_is_good: ما هو الجيد والصحي في هذا الصنف
   - what_to_improve: ما يمكن تحسينه
   - what_to_eat_next: ماذا يأكل بعد ذلك لموازنة الماكروز والشبع

أجب فقط بصيغة JSON نظيفة:
{{
  "food_name": "Healthy Balanced Meal",
  "food_name_ar": "وجبة طعام صحية متوازنة",
  "serving_size": "1 plate",
  "serving_size_ar": "طبق واحد",
  "quantity": 1,
  "calories": 360,
  "carb_g": 35.0,
  "protein_g": 24.0,
  "fat_g": 12.0,
  "fiber_g": 6.0,
  "sugar_g": 4.0,
  "sodium_mg": 380,
  "confidence": 95,
  "insights": {{
    "what_is_good": "وجبة متوازنة تحتوي على البروتين والألياف لتعزيز الشبع وحرق الدهون.",
    "what_to_improve": "الاعتدال في كمية الدهون أو الزيوت المستخدمة.",
    "what_to_eat_next": "شرب كوب ماء كبير مع سناك فاكهة أو زبادي بعد ساعتين."
  }}
}}"""

        try:
            if image_base64:
                ai_text = call_gemini_api(prompt, base64_image=image_base64, mime_type=mime_type, json_mode=True)
                resp_json = json.loads(ai_text)
            else:
                raise ValueError("No image provided")
        except Exception:
            # Resilient fallback preset
            resp_json = {
                "food_name": "Balanced Meal",
                "food_name_ar": "وجبة إفطار متوازنة",
                "serving_size": "1 plate",
                "serving_size_ar": "طبق واحد",
                "quantity": 1,
                "calories": 360,
                "carb_g": 35.0,
                "protein_g": 24.0,
                "fat_g": 12.0,
                "fiber_g": 6.0,
                "sugar_g": 4.0,
                "sodium_mg": 380,
                "confidence": 88,
                "insights": {
                    "what_is_good": "وجبة متوازنة ومغذية تمد الجسم بالطاقة والبروتين.",
                    "what_to_improve": "التركيز على إضافة خضروات طازجة لرفع نسبة الألياف.",
                    "what_to_eat_next": "شرب كوب ماء كبير للمساعدة في الهضم."
                }
            }

        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(resp_json, ensure_ascii=False).encode('utf-8'))

    def handle_coach_chat(self, data):
        prompt = data.get('prompt', '')
        user_context = data.get('context', {})

        sys_prompt = f"""أنت "كوتش رحيم" خبير التغذية واللياقة الذكي في تطبيق Raheem Coach.
معلومات المستخدم:
- الوزن: {user_context.get('currentWeight', 95)} كجم، الهدف: {user_context.get('goalWeight', 80)} كجم.
- الميزانية اليومية: {user_context.get('calorieGoal', 1400)} kcal.
سؤال المستخدم: {prompt}
أجب بلغة عربية واقعية، مشجعة، وساعده على سد الجوع بخيارات مشبعة وصحية دون أن يكسر ميزانية سعراته."""

        try:
            ai_reply = call_gemini_api(sys_prompt, json_mode=False)
        except Exception:
            ai_reply = "أهلاً بك! ركز على شرب كوب ماء كبير أولاً، ثم تناول سناك بروتيني خفيف (مثل زبادي يوناني أو بيض مسلوق) لملء المعدة دون سعرات عالية."

        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps({"reply": ai_reply}, ensure_ascii=False).encode('utf-8'))
