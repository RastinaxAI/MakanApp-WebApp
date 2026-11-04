import * as uiText from '@/content/fa';
export type EducationActor = {
  userId: string;
  active: boolean;
  roles: ('Manager' | 'Teacher' | 'Learner')[];
  capabilities: ('DesignEducation' | 'EvaluateEducation')[];
};
export type EducationGrade = {
  score: number;
  feedback: string;
  privateNote: string;
  published: boolean;
  version: number;
  history: { score: number; reason: string; version: number }[];
};
export type EducationQuestion = {
  id: string;
  prompt: string;
  type: 'choice' | 'text';
  points: number;
  options: string[];
  correct: number;
};
export type EducationState = {
  version: 2;
  archived: boolean;
  assignment: {
    title: string;
    description: string;
    dueAt: string;
    total: number;
    attempts: number;
    published: boolean;
  };
  response: { text: string; files: string[]; submitted: boolean; receipt: string | null };
  assignmentGrade: EducationGrade;
  exam: {
    title: string;
    description: string;
    minutes: number;
    published: boolean;
    questions: EducationQuestion[];
  };
  attempt: {
    startedAt: number | null;
    deadline: number | null;
    answers: Record<string, string>;
    pending: Record<string, string>;
    submitted: boolean;
    receipt: string | null;
  };
  examGrade: EducationGrade;
};
const samplePrompt = uiText.text_c2713e289a02;
export function sampleEducationState(): EducationState {
  return {
    version: 2,
    archived: false,
    assignment: {
      title: uiText.text_2dc8c7c23f8a,
      description: uiText.text_b621650a18c0,
      dueAt: '2026-11-05T20:29:00Z',
      total: 20,
      attempts: 2,
      published: true,
    },
    response: {
      text: uiText.text_c8bdd789b959,
      files: [uiText.text_47e5d96a3e5d],
      submitted: false,
      receipt: null,
    },
    assignmentGrade: {
      score: 18,
      feedback: uiText.text_d1061b5aa4b1,
      privateNote: uiText.text_115e1d08bea1,
      published: false,
      version: 1,
      history: [],
    },
    exam: {
      title: uiText.text_affad8d9215a,
      description: uiText.text_d77758aaa8d5,
      minutes: 15,
      published: true,
      questions: Array.from({ length: 5 }, (_, i) => ({
        id: 'q' + (i + 1),
        prompt: i === 4 ? uiText.text_b8f88f240683 : samplePrompt,
        type: i === 4 ? 'text' : 'choice',
        points: i === 4 ? 8 : 3,
        options:
          i === 4
            ? []
            : [uiText.text_fed04080569d, uiText.text_ef70f5a14bb4, uiText.text_02ad5c3a8e98],
        correct: 1,
      })),
    },
    attempt: {
      startedAt: null,
      deadline: null,
      answers: {
        q1: '1',
        q2: '0',
        q3: '1',
        q5: uiText.text_9dd825987398,
      },
      pending: {},
      submitted: false,
      receipt: null,
    },
    examGrade: {
      score: 17,
      feedback: uiText.text_8bf12f329fad,
      privateNote: '',
      published: false,
      version: 1,
      history: [],
    },
  };
}
export function canDesignEducation(actor: EducationActor) {
  return (
    actor.active &&
    (actor.roles.includes('Teacher') ||
      (actor.roles.includes('Manager') && actor.capabilities.includes('DesignEducation')))
  );
}
export function canEvaluateEducation(actor: EducationActor) {
  return (
    actor.active &&
    (actor.roles.includes('Teacher') ||
      (actor.roles.includes('Manager') && actor.capabilities.includes('EvaluateEducation')))
  );
}
export function educationNumber(raw: string) {
  return Number(
    raw
      .replace(/[۰-۹]/g, (c) => String(uiText.text_9864adedd182.indexOf(c)))
      .replace(/[٠-٩]/g, (c) => String(uiText.text_252a75c3a0e3.indexOf(c)))
      .replace(uiText.text_682a2e9775e3, '.')
      .match(/-?\d+(?:\.\d+)?/)?.[0] ?? NaN,
  );
}
export class PreviewEducationService {
  constructor(
    readonly actor: EducationActor,
    private state: EducationState,
    private commit: (state: EducationState) => void,
    private now = () => Date.now(),
  ) {}
  private update(action: (next: EducationState) => void) {
    const next = structuredClone(this.state);
    action(next);
    this.state = next;
    this.commit(next);
    return next;
  }
  private member() {
    if (!this.actor.active) throw Error(uiText.text_111933baaec5);
    if (this.state.archived) throw Error(uiText.text_258882cc0ddc);
  }
  private designer() {
    this.member();
    if (!canDesignEducation(this.actor)) throw Error(uiText.text_7c454393dfcf);
  }
  private evaluator() {
    this.member();
    if (!canEvaluateEducation(this.actor)) throw Error(uiText.text_097cdb8a6be1);
  }
  saveAssignment(value: EducationState['assignment']) {
    this.designer();
    if (!value.title.trim() || !value.description.trim()) throw Error(uiText.text_3dad3e8394ac);
    if (
      !Number.isFinite(value.total) ||
      value.total <= 0 ||
      !Number.isInteger(value.attempts) ||
      value.attempts < 1
    )
      throw Error(uiText.text_266d496a9f42);
    if (!Number.isFinite(Date.parse(value.dueAt))) throw Error(uiText.text_929b1d446a8e);
    return this.update((s) => {
      s.assignment = { ...value, published: false };
    });
  }
  publishAssignment(confirmed: boolean) {
    this.designer();
    if (!confirmed) throw Error(uiText.text_b3f9c2ef676e);
    return this.update((s) => {
      s.assignment.published = true;
    });
  }
  saveResponse(text: string, files: string[]) {
    this.member();
    if (this.state.response.submitted) throw Error(uiText.text_b178997648da);
    return this.update((s) => {
      s.response.text = text;
      s.response.files = files;
    });
  }
  submitResponse(confirmed: boolean) {
    this.member();
    if (!confirmed) throw Error(uiText.text_5188234a0049);
    if (!this.state.assignment.published) throw Error(uiText.text_04ffd9c20a92);
    if (!this.state.response.text.trim() && !this.state.response.files.length)
      throw Error(uiText.text_ad6851ab1af8);
    if (this.now() > Date.parse(this.state.assignment.dueAt)) throw Error(uiText.text_949406d5f661);
    if (this.state.response.submitted) return this.state;
    return this.update((s) => {
      s.response.submitted = true;
      s.response.receipt = 'DEMO-TASK-0384';
    });
  }
  saveExam(value: Pick<EducationState['exam'], 'title' | 'description' | 'minutes'>) {
    this.designer();
    if (!value.title.trim() || !Number.isFinite(value.minutes) || value.minutes <= 0)
      throw Error(uiText.text_bd7b3fcfc512);
    return this.update((s) => {
      Object.assign(s.exam, value, { published: false });
    });
  }
  saveQuestion(question: EducationQuestion) {
    this.designer();
    if (!question.prompt.trim() || !Number.isFinite(question.points) || question.points <= 0)
      throw Error(uiText.text_75bf476d57c9);
    if (
      question.type === 'choice' &&
      (question.options.length < 2 ||
        question.options.some((x) => !x.trim()) ||
        question.correct < 0 ||
        question.correct >= question.options.length)
    )
      throw Error(uiText.text_0bac204b4770);
    return this.update((s) => {
      const i = s.exam.questions.findIndex((x) => x.id === question.id);
      if (i < 0) s.exam.questions.push(question);
      else s.exam.questions[i] = question;
    });
  }
  publishExam(confirmed: boolean) {
    this.designer();
    if (!confirmed) throw Error(uiText.text_bb0b733e9641);
    if (!this.state.exam.questions.length) throw Error(uiText.text_5582faf11763);
    return this.update((s) => {
      s.exam.published = true;
    });
  }
  startExam(confirmed: boolean) {
    this.member();
    if (!confirmed) throw Error(uiText.text_a6118e3805da);
    if (!this.state.exam.published) throw Error(uiText.text_1e9760d3b4b8);
    if (this.state.attempt.submitted) throw Error(uiText.text_2398f7fd61c9);
    if (this.state.attempt.startedAt !== null) return this.state;
    return this.update((s) => {
      s.attempt.startedAt = this.now();
      s.attempt.deadline = this.now() + s.exam.minutes * 60000;
    });
  }
  saveAnswer(questionId: string, value: string, online: boolean) {
    this.member();
    const a = this.state.attempt;
    if (a.startedAt === null || a.submitted || this.now() > a.deadline!)
      throw Error(uiText.text_aea1cc1610e2);
    return this.update((s) => {
      if (online) {
        s.attempt.answers[questionId] = value;
        delete s.attempt.pending[questionId];
      } else s.attempt.pending[questionId] = value;
    });
  }
  reconnect() {
    this.member();
    if (this.state.attempt.deadline !== null && this.now() > this.state.attempt.deadline)
      throw Error(uiText.text_64cb283a947a);
    return this.update((s) => {
      Object.assign(s.attempt.answers, s.attempt.pending);
      s.attempt.pending = {};
    });
  }
  submitExam() {
    this.member();
    if (this.state.attempt.startedAt === null) throw Error(uiText.text_6e364b74a778);
    if (Object.keys(this.state.attempt.pending).length) throw Error(uiText.text_86d84f271049);
    if (this.state.attempt.submitted) return this.state;
    return this.update((s) => {
      s.attempt.submitted = true;
      s.attempt.receipt = 'DEMO-EXAM-0128';
    });
  }
  saveGrade(kind: 'assignment' | 'exam', score: number, feedback: string, privateNote = '') {
    this.evaluator();
    const maximum =
      kind === 'assignment'
        ? this.state.assignment.total
        : this.state.exam.questions.reduce((n, q) => n + q.points, 0);
    if (!Number.isFinite(score) || score < 0 || score > maximum)
      throw Error(uiText.text_54535c5248b4);
    return this.update((s) => {
      const grade = kind === 'assignment' ? s.assignmentGrade : s.examGrade;
      if (grade.published) throw Error(uiText.text_5e531489dc01);
      Object.assign(grade, { score, feedback, privateNote });
    });
  }
  publishGrade(kind: 'assignment' | 'exam') {
    this.evaluator();
    return this.update((s) => {
      (kind === 'assignment' ? s.assignmentGrade : s.examGrade).published = true;
    });
  }
  correctGrade(score: number, reason: string, confirmed: boolean) {
    this.evaluator();
    if (!confirmed || !reason.trim()) throw Error(uiText.text_412f21a35f7b);
    const maximum = this.state.exam.questions.reduce((n, q) => n + q.points, 0);
    if (!Number.isFinite(score) || score < 0 || score > maximum)
      throw Error(uiText.text_0893d87c938f);
    return this.update((s) => {
      s.examGrade.history.push({ score: s.examGrade.score, reason, version: s.examGrade.version });
      s.examGrade.score = score;
      s.examGrade.version++;
      s.examGrade.published = true;
    });
  }
  memberResult(kind: 'assignment' | 'exam') {
    if (!this.actor.active) throw Error(uiText.text_111933baaec5);
    const g = kind === 'assignment' ? this.state.assignmentGrade : this.state.examGrade;
    return g.published
      ? { score: g.score, feedback: g.feedback, version: g.version, history: g.history }
      : null;
  }
}
