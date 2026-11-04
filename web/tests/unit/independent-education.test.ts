import { describe, it, expect } from 'vitest';
import {
  PreviewEducationService,
  sampleEducationState,
  canDesignEducation,
  canEvaluateEducation,
  educationNumber,
  type EducationActor,
} from '@/features/extracurricular/education-model';
const manager: EducationActor = {
  userId: 'manager',
  active: true,
  roles: ['Manager'],
  capabilities: ['DesignEducation', 'EvaluateEducation'],
};
function fixture(actor = manager) {
  let state = sampleEducationState(),
    now = Date.parse('2026-11-02T14:30:00Z');
  const service = new PreviewEducationService(
    actor,
    state,
    (next) => {
      state = next;
    },
    () => now,
  );
  return {
    service,
    get state() {
      return state;
    },
    advance: (milliseconds: number) => {
      now += milliseconds;
    },
  };
}
describe('confirmed independent education boundary', () => {
  it('requires explicit education capabilities for a manager, without requiring Teacher', () => {
    expect(canDesignEducation(manager)).toBe(true);
    expect(canEvaluateEducation(manager)).toBe(true);
    expect(canDesignEducation({ ...manager, capabilities: [] })).toBe(false);
    expect(canEvaluateEducation({ ...manager, capabilities: ['DesignEducation'] })).toBe(false);
    expect(canDesignEducation({ ...manager, roles: ['Teacher'], capabilities: [] })).toBe(true);
    expect(canDesignEducation({ ...manager, active: false })).toBe(false);
  });
  it('does not grant authoring to a learner or an organization role alone', () => {
    const f = fixture({ ...manager, roles: ['Learner'], capabilities: [] });
    expect(() => f.service.saveAssignment(f.state.assignment)).toThrow('اختیار');
    expect(() => f.service.saveGrade('assignment', 18, 'خوب')).toThrow('اختیار');
  });
  it('keeps assignment review separate from publication', () => {
    const f = fixture();
    f.service.saveAssignment({ ...f.state.assignment, title: 'عنوان تازه' });
    expect(f.state.assignment.published).toBe(false);
    expect(() => f.service.publishAssignment(false)).toThrow('تأیید');
    f.service.publishAssignment(true);
    expect(f.state.assignment.published).toBe(true);
  });
  it.each([0, -1, NaN])('rejects an invalid assignment total %s', (total) => {
    const f = fixture();
    expect(() => f.service.saveAssignment({ ...f.state.assignment, total })).toThrow('معتبر');
  });
  it('requires a reviewed response and returns one stable local receipt', () => {
    const f = fixture();
    expect(() => f.service.submitResponse(false)).toThrow('تأیید');
    f.service.submitResponse(true);
    expect(f.state.response.receipt).toMatch(/^DEMO-/);
    const receipt = f.state.response.receipt;
    f.service.submitResponse(true);
    expect(f.state.response.receipt).toBe(receipt);
    expect(() => f.service.saveResponse('دوباره', [])).toThrow('قبلاً');
  });
  it('rejects empty and late responses', () => {
    const f = fixture();
    f.service.saveResponse('', []);
    expect(() => f.service.submitResponse(true)).toThrow('متن یا فایل');
    f.service.saveResponse('پاسخ', []);
    f.advance(10 * 86400000);
    expect(() => f.service.submitResponse(true)).toThrow('مهلت');
  });
  it('does not publish a saved grade or expose private evaluator notes', () => {
    const f = fixture();
    f.service.saveGrade('assignment', 16, 'بازخورد عمومی', 'یادداشت خصوصی آزمایشی');
    expect(f.service.memberResult('assignment')).toBeNull();
    f.service.publishGrade('assignment');
    expect(f.service.memberResult('assignment')).toEqual({
      score: 16,
      feedback: 'بازخورد عمومی',
      version: 1,
      history: [],
    });
    expect(JSON.stringify(f.service.memberResult('assignment'))).not.toContain('خصوصی');
  });
  it('checks the grade against the actual maximum', () => {
    const f = fixture();
    expect(() => f.service.saveGrade('assignment', 21, '')).toThrow('بارم');
    expect(() => f.service.saveGrade('exam', -1, '')).toThrow('بارم');
  });
  it('starts the timer once and retains unacknowledged offline changes separately', () => {
    const f = fixture();
    expect(() => f.service.startExam(false)).toThrow('تأیید');
    f.service.startExam(true);
    const deadline = f.state.attempt.deadline;
    f.advance(10000);
    f.service.startExam(true);
    expect(f.state.attempt.deadline).toBe(deadline);
    f.service.saveAnswer('q3', '2', false);
    expect(f.state.attempt.answers.q3).toBe('1');
    expect(f.state.attempt.pending.q3).toBe('2');
    expect(() => f.service.submitExam()).toThrow('منتظر');
    f.service.reconnect();
    expect(f.state.attempt.answers.q3).toBe('2');
    expect(f.state.attempt.pending).toEqual({});
    f.service.submitExam();
    expect(f.state.attempt.receipt).toMatch(/^DEMO-/);
    expect(() => f.service.saveAnswer('q3', '0', true)).toThrow('باز نیست');
  });
  it('does not pause time while offline or accept expired pending changes', () => {
    const f = fixture();
    f.service.startExam(true);
    f.service.saveAnswer('q3', '2', false);
    f.advance(16 * 60000);
    expect(() => f.service.reconnect()).toThrow('تمام شده');
    expect(() => f.service.saveAnswer('q4', '1', true)).toThrow('باز نیست');
    expect(f.state.attempt.pending.q3).toBe('2');
  });
  it('rejects fresh work after archive or revoked membership', () => {
    const a = fixture({ ...manager, active: false });
    expect(() => a.service.startExam(true)).toThrow('فعال نیست');
    const state = sampleEducationState();
    state.archived = true;
    const b = new PreviewEducationService(manager, state, () => {});
    expect(() => b.submitResponse(true)).toThrow('بایگانی');
  });
  it('validates question options, points and publication review', () => {
    const f = fixture(),
      question = f.state.exam.questions[0];
    expect(() => f.service.saveQuestion({ ...question, correct: 99 })).toThrow('پاسخ صحیح');
    expect(() => f.service.saveQuestion({ ...question, points: 0 })).toThrow('بارم');
    f.service.saveQuestion({ ...question, prompt: 'سؤال ویرایش‌شده' });
    expect(f.state.exam.questions[0].prompt).toBe('سؤال ویرایش‌شده');
    expect(() => f.service.publishExam(false)).toThrow('تأیید');
  });
  it('retains published result history and requires a correction reason', () => {
    const f = fixture();
    f.service.publishGrade('exam');
    expect(() => f.service.saveGrade('exam', 18, '')).toThrow('اصلاحیه');
    expect(() => f.service.correctGrade(18, '', true)).toThrow('علت');
    f.service.correctGrade(18, 'بازبینی بخش مثال', true);
    expect(f.state.examGrade.version).toBe(2);
    expect(f.state.examGrade.history[0]).toEqual({
      score: 17,
      reason: 'بازبینی بخش مثال',
      version: 1,
    });
  });
  it('normalizes reference Persian/Arabic numerals', () => {
    expect(educationNumber('۲۰')).toBe(20);
    expect(educationNumber('٢ بار')).toBe(2);
    expect(educationNumber('۱۷٫۵')).toBe(17.5);
    expect(educationNumber('')).toBeNaN();
  });
});
