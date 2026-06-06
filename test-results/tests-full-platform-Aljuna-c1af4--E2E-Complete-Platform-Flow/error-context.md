# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\full-platform.spec.ts >> Aljunaid Platform Full E2E >> Complete Platform Flow
- Location: tests\full-platform.spec.ts:10:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected: "http://localhost:5173/dashboard"
Received: "http://localhost:5173/"
Timeout:  5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    3 × unexpected value "http://localhost:5173/login"
    10 × unexpected value "http://localhost:5173/"

```

```yaml
- complementary:
  - img "شعار منصة الجنيد"
  - text: منصة الجنيد التعليمية
  - navigation:
    - button "الرئيسية":
      - img
      - text: الرئيسية
    - button "المقررات":
      - img
      - text: المقررات
    - button "الدروس":
      - img
      - text: الدروس
    - button "المحتوى":
      - img
      - text: المحتوى
    - button "الاختبارات":
      - img
      - text: الاختبارات
    - button "نشر الدروس":
      - img
      - text: نشر الدروس
  - text: ا المهندس نذير natheer@example.com
  - button "تسجيل الخروج":
    - img
- banner:
  - button:
    - img
  - heading "الرئيسية" [level=1]
  - paragraph: منصة الجنيد التعليمية
  - text: مشرف النظام
- main:
  - heading "أهلاً، مشرف النظام" [level=2]
  - paragraph: مرحباً بك في لوحة تحكم منصة الجنيد التعليمية
  - img
  - text: إجمالي المقررات 4 4 مقرر مسجّل
  - img
  - text: إجمالي الدروس 5 0 منشور · 5 غير منشور
  - img
  - text: إجمالي الاختبارات 0 0 سؤال إجمالاً
  - img
  - heading "آخر العمليات" [level=3]
  - img
  - text: "تم إنشاء مقرر: ايمن 2026-06-04T17:12:43.424Z"
  - img
  - text: "تم إنشاء درس: علبيلي 2026-06-04T15:48:32.208Z"
  - img
  - text: "تم إنشاء مقرر: علي علي 2026-06-04T15:47:48.173Z"
  - img
  - text: "تم إنشاء مقرر: علي 2026-06-04T15:47:02.635Z"
  - img
  - text: "تم إنشاء درس: علي 2026-06-04T15:33:09.209Z"
  - img
  - text: "تم إنشاء درس: مقدمة 2026-06-04T15:17:14.788Z"
  - img
  - heading "حالة الدروس" [level=3]
  - text: نسبة النشر 0% منشور (0) غير منشور (5)
  - img
  - text: مقدمة في النهايات مسودة
  - img
  - text: نظريات النهايات الأساسية مسودة
  - img
  - text: مقدمة مسودة
  - img
  - text: علي مسودة
  - img
  - text: علبيلي مسودة
```