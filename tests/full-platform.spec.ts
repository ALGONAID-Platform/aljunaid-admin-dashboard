import { test, expect } from '@playwright/test';

test.describe('Aljunaid Platform Full E2E', () => {
  const timestamp = Date.now();
  const testCourseName = `E2E Course ${timestamp}`;
  const testModuleName = `E2E Module ${timestamp}`;
  const testLessonName = `E2E Lesson ${timestamp}`;
  const testExamName = `E2E Exam ${timestamp}`;
  
  test('Complete Platform Flow', async ({ page }) => {
    test.setTimeout(120000); // 2 mins timeout for full flow

    // 1. Login
    await test.step('Login to platform', async () => {
      await page.goto('http://localhost:5173/login');
      
      // Use more robust selectors
      await page.getByPlaceholder('example@domain.com').fill('natheer@example.com');
      await page.getByPlaceholder('أدخل كلمة المرور').fill('Password123!');
      await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
      
      // Wait for navigation to dashboard
      await expect(page).toHaveURL('http://localhost:5173/dashboard');
      await expect(page.getByText('مرحباً بك في منصة الجنيد التعليمية')).toBeVisible();
    });

    // 2. Create Course
    await test.step('Create a new course', async () => {
      await page.getByRole('button', { name: 'المقررات' }).click();
      await page.getByRole('button', { name: 'إنشاء مقرر جديد' }).click();
      
      await page.getByRole('textbox', { name: 'اسم المقرر' }).fill(testCourseName);
      await page.getByRole('textbox', { name: 'وصف المقرر' }).fill('وصف المقرر التجريبي E2E');
      await page.getByRole('combobox').selectOption('SECONDARY');
      
      await page.getByRole('button', { name: 'حفظ المقرر' }).click();
      
      // Wait for success and modal close
      await expect(page.getByText('تم الحفظ!')).toBeVisible();
      await expect(page.getByRole('dialog')).not.toBeVisible();
      await expect(page.getByText(testCourseName)).toBeVisible();
    });

    // 3. Create Lesson & Module
    await test.step('Create a module and lesson', async () => {
      await page.getByRole('button', { name: 'الدروس' }).click();
      await page.getByRole('button', { name: 'إنشاء درس جديد' }).click();
      
      // Select course
      await page.getByRole('combobox').nth(0).selectOption({ label: testCourseName });
      
      // Create inline module
      await page.getByRole('button', { name: 'إنشاء وحدة جديدة' }).click();
      await page.getByPlaceholder('اسم الوحدة...').fill(testModuleName);
      await page.getByPlaceholder('وصف الوحدة...').fill('وصف الوحدة التجريبي E2E');
      await page.getByRole('button', { name: 'إنشاء الوحدة' }).click();
      
      // Fill lesson details
      await page.getByRole('textbox', { name: 'عنوان الدرس' }).fill(testLessonName);
      await page.getByRole('textbox', { name: 'وصف الدرس' }).fill('وصف الدرس التجريبي E2E');
      await page.getByPlaceholder('رقم الترتيب').fill('1');
      
      await page.getByRole('button', { name: 'حفظ الدرس' }).click();
      
      // Wait for success
      await expect(page.getByText('تم الحفظ!')).toBeVisible();
      await expect(page.getByRole('dialog')).not.toBeVisible();
      await expect(page.getByText(testLessonName)).toBeVisible();
    });

    // 4. Create Content
    await test.step('Create lesson content', async () => {
      await page.getByRole('button', { name: 'المحتوى' }).click();
      await page.getByRole('button', { name: 'إضافة محتوى' }).click();
      
      await page.getByRole('combobox').selectOption({ label: `${testLessonName} (${testCourseName})` });
      await page.getByRole('textbox', { name: 'عنوان المحتوى' }).fill('محتوى فيديو تجريبي');
      
      // Select video type
      await page.getByText('فيديو (رابط URL)').click();
      await page.getByRole('textbox', { name: 'الرابط الخارجي' }).fill('https://example.com/video.mp4');
      await page.getByRole('textbox', { name: 'وصف المحتوى' }).fill('فيديو E2E');
      
      await page.getByRole('button', { name: 'حفظ المحتوى' }).click();
      
      // Wait for success
      await expect(page.getByText('تم الرفع!')).toBeVisible();
      await expect(page.getByRole('dialog')).not.toBeVisible();
      await expect(page.getByText('محتوى فيديو تجريبي')).toBeVisible();
    });

    // 5. Edit Content
    await test.step('Edit lesson content', async () => {
      // Find the edit button for the newly created content
      const contentItem = page.locator('div.flex-1.min-w-0', { hasText: 'محتوى فيديو تجريبي' }).locator('..');
      await contentItem.locator('button').nth(0).click(); // Edit button is the first one
      
      await expect(page.getByText('تعديل محتوى الدرس')).toBeVisible();
      await page.getByRole('textbox', { name: 'عنوان المحتوى' }).fill('محتوى فيديو تجريبي (معدل)');
      await page.getByRole('button', { name: 'حفظ المحتوى' }).click();
      
      await expect(page.getByText('تم الرفع!')).toBeVisible();
      await expect(page.getByRole('dialog')).not.toBeVisible();
      await expect(page.getByText('محتوى فيديو تجريبي (معدل)')).toBeVisible();
    });

    // 6. Delete Content
    await test.step('Delete lesson content', async () => {
      page.on('dialog', dialog => dialog.accept()); // Accept confirm dialog
      
      const contentItem = page.locator('div.flex-1.min-w-0', { hasText: 'محتوى فيديو تجريبي (معدل)' }).locator('..');
      await contentItem.locator('button').nth(1).click(); // Delete button is the second one
      
      await expect(page.getByText('محتوى فيديو تجريبي (معدل)')).not.toBeVisible();
    });

    // 7. Create Exam
    await test.step('Create exam', async () => {
      await page.getByRole('button', { name: 'الاختبارات' }).click();
      await page.getByRole('button', { name: 'إنشاء اختبار جديد' }).click();
      
      await page.getByRole('combobox').nth(0).selectOption({ label: testCourseName });
      await page.getByRole('combobox').nth(1).selectOption({ label: testLessonName });
      
      await page.getByRole('textbox', { name: 'عنوان الاختبار' }).fill(testExamName);
      await page.getByRole('textbox', { name: 'وصف الاختبار' }).fill('وصف اختبار E2E');
      await page.getByRole('textbox', { name: 'تعليمات للطلاب' }).fill('تعليمات اختبار E2E');
      
      await page.getByRole('button', { name: 'التالي: إضافة الأسئلة ←' }).click();
      
      // Question 1
      await page.getByRole('textbox', { name: 'اكتب نص السؤال هنا' }).fill('السؤال الأول E2E؟');
      await page.getByRole('button', { name: 'صح / خطأ' }).click();
      
      await page.getByRole('button', { name: 'حفظ الاختبار (1 سؤال)' }).click();
      
      await expect(page.getByText('تم الحفظ!')).toBeVisible();
      await expect(page.getByRole('dialog')).not.toBeVisible();
      await expect(page.getByText(testExamName)).toBeVisible();
    });

    // 8. Publish Lesson
    await test.step('Publish lesson', async () => {
      await page.getByRole('button', { name: 'نشر الدروس' }).click();
      
      // Select the lesson in the list
      await page.getByText(testLessonName).click();
      
      // Click publish button
      await page.getByRole('button', { name: 'نشر الدرس الآن' }).click();
      await page.getByRole('button', { name: 'حسناً' }).click(); // Close success modal
      
      // Wait for status to show "منشور"
      await expect(page.getByText('منشور').first()).toBeVisible();
    });

    // 9. Logout
    await test.step('Logout', async () => {
      await page.getByRole('button', { name: 'تسجيل الخروج' }).click();
      await expect(page).toHaveURL('http://localhost:5173/login');
    });

  });
});