/** Domain types for the demo dataset (mock data only — no real people). */

export type Role = 'student' | 'teacher' | 'guardian' | 'manager' | 'admin';

export interface Person {
  id: string;
  name: string;
  phone: string;
  username: string;
  bio?: string;
  grade?: string;
  roles: Role[];
}

export interface School {
  id: string;
  name: string;
  city: string;
  plan: 'پایه' | 'حرفه‌ای' | 'سازمانی';
  seats: number;
  usedSeats: number;
  active: boolean;
  weekStart: string;
  timezone: string;
  aiQuota: { used: number; total: number };
}

export interface Term {
  id: string;
  name: string;
  from: string;
  to: string;
}

export interface Lesson {
  id: string;
  name: string;
  field: string;
  level: string;
  goals: string[];
}

export type ClassStatus = 'draft' | 'active' | 'completed' | 'archived';

export interface ClassRoom {
  id: string;
  schoolId: string;
  name: string;
  lessonId: string;
  termId: string;
  teacherIds: string[];
  studentIds: string[];
  capacity: number;
  status: ClassStatus;
  groupChatId: string;
  color: string;
}

export type AttendanceStatus = 'unset' | 'present' | 'absent' | 'late' | 'excused';

export interface LiveSession {
  id: string;
  classId: string;
  title: string;
  startsAt: string;
  durationMin: number;
  meetLink?: string;
  status: 'scheduled' | 'live' | 'done' | 'cancelled';
  provider: 'Google Meet';
  attendance: Record<string, AttendanceStatus>;
  materialIds: string[];
  homeworkId?: string;
}

export interface Resource {
  id: string;
  title: string;
  kind: 'pdf' | 'image' | 'link' | 'video';
  sizeKb: number;
  version: number;
  publishedAt: string;
  status: 'ready' | 'processing' | 'failed' | 'retired';
  classIds: string[];
  aiReady: boolean;
  pages?: number;
}

export interface Attempt {
  number: number;
  text: string;
  fileName?: string;
  createdAt: string;
  receivedAt?: string;
  receiptId?: string;
  state: 'draft' | 'queued' | 'received' | 'late';
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  attempts: Attempt[];
  status: 'not-started' | 'draft' | 'submitted' | 'returned' | 'graded';
  score?: number;
  feedback?: string;
  privateNote?: string;
  publishedAt?: string;
}

export interface Assignment {
  id: string;
  classId: string;
  title: string;
  body: string;
  version: number;
  publishedAt: string;
  dueAt: string;
  allowLate: boolean;
  maxAttempts: number;
  scoredAttempt: 'latest' | 'best';
  resourceIds: string[];
  rubric: { label: string; points: number }[];
}

export interface ExamQuestion {
  id: string;
  prompt: string;
  options: string[];
  answer: number;
  points: number;
}

export interface Exam {
  id: string;
  classId: string;
  title: string;
  topic: string;
  questions: ExamQuestion[];
  durationMin: number;
  opensAt: string;
  closesAt: string;
  maxAttempts: number;
  releasePolicy: 'after-review' | 'auto';
  resultsPublished: boolean;
}

export interface ExamAttemptRecord {
  id: string;
  examId: string;
  studentId: string;
  startedAt: string;
  answers: Record<string, number>;
  pending: Record<string, number>;
  finishedAt?: string;
  autoScore?: number;
  released?: boolean;
}

export type ConversationKind = 'direct' | 'group' | 'channel';

export interface ChatMessage {
  id: string;
  authorId: string;
  text: string;
  at: string;
  state: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  attachment?: { name: string; sizeKb: number; kind: 'pdf' | 'image' | 'audio' | 'video' };
  replyTo?: string;
}

export interface Conversation {
  id: string;
  kind: ConversationKind;
  title: string;
  subtitle?: string;
  memberIds: string[];
  ownerId: string;
  adminIds: string[];
  classId?: string;
  schoolId?: string;
  pinned: boolean;
  muted: boolean;
  unread: number;
  messages: ChatMessage[];
  aiPolicy: 'off' | 'class-only' | 'on-request';
}

export interface Source {
  id: string;
  title: string;
  kind: 'file' | 'link';
  sizeKb?: number;
  status: 'processing' | 'ready' | 'failed';
  quality: 'high' | 'low' | 'pending';
  pages?: number;
  url?: string;
  license: string;
  assignedTo: string[];
  processingNote?: string;
}

/** A source one person added for themselves. Private to that person: it is
    not a class resource and never shows up in a school or shared notebook. */
export interface PersonalSource {
  id: string;
  title: string;
  kind: 'file' | 'link' | 'note';
  url?: string;
  note?: string;
  ownerId: string;
  addedAt: string;
}

export interface Notebook {
  id: string;
  title: string;
  sourceIds: string[];
  archived: boolean;
  updatedAt: string;
  messages: { role: 'user' | 'assistant'; text: string; at: string; citations?: string[] }[];
}

export interface Invoice {
  id: string;
  number: string;
  amount: number;
  status: 'unpaid' | 'pending' | 'paid' | 'rejected';
  issuedAt: string;
  paidAt?: string;
  ref?: string;
  method?: 'online' | 'manual';
  plan: string;
}

export interface ApplicationRequest {
  id: string;
  applicantName: string;
  phone: string;
  username: string;
  nationalId: string;
  schoolName: string;
  foundedAt: string;
  parentOrg: string;
  licenseName: string;
  licenseKb: number;
  city: string;
  topic: string;
  level: string;
  capacity: number;
  needs: string;
  resourceIds: string[];
  status: 'draft' | 'submitted' | 'pre-approved' | 'rejected' | 'invoiced' | 'paid' | 'activated';
  steps: { at: string; label: string; actor: string }[];
  invoice?: Invoice;
  rejectReason?: string;
}

export interface GuardianLink {
  studentId: string;
  guardianId: string;
  relation: 'mother' | 'father' | 'grandparent' | 'supervisor';
  status: 'pending' | 'verified' | 'expired' | 'revoked';
  scopes: { scores: boolean; attendance: boolean; reports: boolean; messaging: boolean };
  verifiedBy: string;
  expiresAt?: string;
}

export interface AppNotification {
  id: string;
  kind: 'assignment' | 'exam' | 'message' | 'grade' | 'account' | 'ops';
  title: string;
  body: string;
  at: string;
  read: boolean;
  href?: string;
  schoolId?: string;
}

export interface Ticket {
  id: string;
  code: string;
  subject: string;
  status: 'open' | 'answered' | 'closed';
  createdAt: string;
  assignee: string;
  messages: { from: 'user' | 'support'; text: string; at: string }[];
}