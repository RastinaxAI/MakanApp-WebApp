import fs from 'node:fs/promises';
const supplied = JSON.parse(await fs.readFile('design/reference-v2/screens.json', 'utf8'));
const previous = JSON.parse(await fs.readFile('design/mk-reference.json', 'utf8'));
const capture = JSON.parse(await fs.readFile('output/review/mk-v2/native/capture.json', 'utf8'));
const comparison = JSON.parse(
  await fs.readFile('output/review/mk-v2/native/comparison.json', 'utf8'),
);
const assignment = '/personal/extracurricular/classes/{classId}/assignments';
const exam = '/personal/extracurricular/classes/{classId}/exams';
const routes = {
  44: assignment,
  45: assignment + '/{assignmentId}',
  46: assignment + '/{assignmentId}/answer',
  60: assignment + '/new',
  61: assignment + '/{assignmentId}/publish-review',
  62: assignment + '/{assignmentId}/submissions',
  63: assignment + '/{assignmentId}/receipt',
  64: assignment + '/{assignmentId}/submissions/{submissionId}/evaluate',
  65: assignment + '/{assignmentId}/result',
  66: exam,
  67: exam + '/{examId}/conditions',
  68: exam + '/{examId}/attempts/{attemptId}',
  69: exam + '/new',
  70: exam + '/{examId}/questions',
  71: exam + '/{examId}/publish-review',
  72: exam + '/{examId}/attempts/{attemptId}/review',
  73: exam + '/{examId}/attempts/{attemptId}/receipt',
  74: exam + '/{examId}/result',
  75: exam + '/{examId}/submissions/{submissionId}/evaluate',
  76: exam + '/{examId}/result/correction',
  77: exam + '/{examId}/result',
  78: exam + '/{examId}/attempts/{attemptId}',
  79: '/personal/extracurricular/classes/{classId}',
  80: assignment,
  81: assignment,
  82: exam + '/{examId}/questions',
};
const screens = supplied.screens.map((ref) => {
  const n = Number(ref.id.slice(3)),
    old = previous.screens.find((x) => x.id === ref.id) ?? {},
    education = Boolean(routes[n]);
  return {
    ...old,
    ...ref,
    referenceVersion: 'V2',
    route: routes[n] ?? old.route,
    component: education
      ? 'EducationPreview + PreviewEducationService / ClassLifecyclePending'
      : old.component,
    state: ref.title,
    role: education
      ? [62, 64, 75, 76].includes(n)
        ? 'Active class-local Teacher or Manager with EvaluateEducation capability'
        : [60, 61, 69, 70, 71, 81, 82].includes(n)
          ? 'Active class-local Teacher or Manager with DesignEducation capability'
          : n === 79
            ? 'Revoked membership; informational boundary only'
            : 'Active authorized member of this class; own response/result only'
      : old.role,
    ui: 'implemented-native-captured',
    interactionSummary: education
      ? 'فرم و بازبینی، انتشار جدا، پیش‌نویس و رسید نمونه، کنترل اختیار، خطا و لغو دسترسی'
      : old.interactionSummary,
    api: education
      ? 'No independent education endpoint assumed; existing organization APIs retained'
      : old.api,
    apiStatus: education ? 'دامنهٔ مصوب V2؛ پیش‌نمایش تعاملی، منتظر قرارداد بک‌اند' : old.apiStatus,
    backendDependency: education
      ? 'قرارداد کلاس مستقل: اختیار آموزشی، نسخه، مخاطب، تلاش/مهلت سروری، ذخیره پاسخ، رسید، انتشار و اصلاح نتیجه؛ public flag=false'
      : old.backendDependency,
    previewRoute: '/preview/reference/' + ref.id,
    reviewedImage: 'output/review/mk-v2/native/' + ref.id + '.png',
    capture: capture.screens.find((x) => x.id === ref.id),
    visualReview: 'reference/app overlay and difference; manual review of contact sheets',
    visualDifference: comparison.screens.find((x) => x.id === ref.id)?.mae255,
  };
});
await fs.writeFile(
  'design/mk-reference.json',
  JSON.stringify(
    {
      ...previous,
      referenceVersion: supplied.reference,
      referenceRoot: 'design/reference-v2',
      sourcePdfSha256: supplied.sourcePdfSha256,
      phase: 'V2 responsive update; independent education confirmed, real backend pending',
      screens,
    },
    null,
    2,
  ) + '\n',
);
let table =
  '# ردیابی ۸۲ نمای مرجع ماکان — نسخهٔ دوم\n\nمرجع نسخهٔ دوم ۳۷ صفحه دارد و شامل ۲۳ نمای تازهٔ MK-60 تا MK-82 است. تکلیف و آزمون مستقل در دامنهٔ مصوب محصول‌اند. این نماها تا دریافت قرارداد معتبر بک‌اند، پیش‌نمایش تعاملی جدا دارند؛ مسیر عمومی دادهٔ نمونه یا موفقیت ساختگی نشان نمی‌دهد. جدول اتصال قبلی برای بخش‌های سالم حفظ شده است.\n\n|شناسه / صفحه PDF|نما|مسیر|اتصال|تصویر|\n|---|---|---|---|---|\n';
for (const s of screens)
  table += `|${s.id} / ${s.page}|${s.title}|\`${s.route}\`|${s.apiStatus}|[تصویر](../${s.reviewedImage}) · \`${s.previewRoute}\`|\n`;
table +=
  '\nمشخصات کامل، نقش، تعامل، وضعیت API، تصویر و اندازه در [manifest](../design/mk-reference.json) است. صفحه‌های تکمیلی پاسخ/مرور/رسید/ارزیابی و اصلاح نتیجه در مسیرهای مستقل ردیابی شده‌اند. پنل مالک همچنان MakanManagement جداست.\n';
await fs.writeFile('docs/MK_REFERENCE_TRACEABILITY_FA.md', table);
console.log('Updated V2 traceability: 82 views.');
