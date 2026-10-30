import { describe, expect, it } from 'vitest';
import { validScore, evaluationLabel } from '@/features/personal/school/evaluation-model';
import { isFocusedPage, isSchoolPath } from '@/config/navigation';
describe('assessment boundaries', () => {
  it('does not convert blanks, infinity, negative scores or excess scores into a valid grade', () => {
    for (const value of ['', ' ', '-1', '20.1', 'Infinity', 'NaN'])
      expect(validScore(value, 20)).toBe(false);
    for (const value of ['0', '12.75', '20']) expect(validScore(value, 20)).toBe(true);
    expect(evaluationLabel('AwaitingRelease')).toBe('در انتظار انتشار');
  });
  it('accepts only exact assessment paths and keeps author forms focused', () => {
    const id = '00000000-0000-4000-8000-000000000004';
    for (const path of [
      ['evaluations'],
      ['assignments', id, 'evaluations'],
      ['assignments', id, 'history'],
      ['submissions', id, 'evaluate'],
      ['submissions', id, 'result'],
      ['exam-submissions', id, 'questions', id],
      ['exams', id, 'grading'],
    ])
      expect(isSchoolPath(path)).toBe(true);
    for (const path of [
      ['submissions', id],
      ['submissions', id, 'grading'],
      ['exam-submissions', id, 'questions', 'bad'],
      ['exam-submissions', id, 'questions', id, 'edit'],
    ])
      expect(isSchoolPath(path)).toBe(false);
    expect(isFocusedPage(`/personal/education/submissions/${id}/evaluate`)).toBe(true);
    expect(isFocusedPage(`/personal/education/exam-submissions/${id}/questions/${id}`)).toBe(true);
  });
});
