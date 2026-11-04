import * as uiText from '@/content/fa';
import type {
  ClassDraft,
  FormationRequest,
  IndependentClass,
  ClassInvitation,
  JoinRequest,
  ClassMember,
  RequestStatus,
} from './model';

/** Legacy preview adapter. Connected operations use api-model and useClassCommand. */
export interface ExtracurricularService {
  readonly mode: 'preview' | 'connected';
  listRequests(): Promise<FormationRequest[]>;
  saveDraft(draft: ClassDraft, id?: string): Promise<FormationRequest>;
  submit(id: string, expectedVersion: number, operationId: string): Promise<FormationRequest>;
  cancel(id: string, expectedVersion: number, operationId: string): Promise<FormationRequest>;
  decide(
    id: string,
    expectedVersion: number,
    decision: Extract<RequestStatus, 'Approved' | 'Rejected' | 'NeedsRevision'>,
    reason: string,
    managerId: string,
    operationId: string,
    teacherId?: string,
  ): Promise<FormationRequest>;
  listClasses(): Promise<IndependentClass[]>;
  getClass(id: string): Promise<IndependentClass>;
  retrySetup(id: string, expectedVersion: number, operationId: string): Promise<IndependentClass>;
  acceptManagement(
    id: string,
    expectedVersion: number,
    operationId: string,
  ): Promise<IndependentClass>;
  start(id: string, expectedVersion: number, operationId: string): Promise<IndependentClass>;
  invite(
    id: string,
    userId: string,
    operationId: string,
    options?: { expiresAt?: string; message?: string },
  ): Promise<ClassInvitation>;
  respondInvitation(id: string, accept: boolean, operationId: string): Promise<ClassInvitation>;
  join(id: string, operationId: string): Promise<JoinRequest>;
  cancelJoin(id: string, operationId: string): Promise<JoinRequest>;
  reviewJoin(
    id: string,
    accept: boolean,
    reason: string,
    operationId: string,
  ): Promise<JoinRequest>;
  updateMember(
    classId: string,
    memberId: string,
    localName: string,
    note: string,
    expectedVersion: number,
  ): Promise<ClassMember>;
  endMembership(
    classId: string,
    memberId: string,
    reason: string,
    operationId: string,
  ): Promise<ClassMember>;
  archive(
    id: string,
    expectedVersion: number,
    reason: string,
    operationId: string,
  ): Promise<IndependentClass>;
}
export const lifecycleContractDependency = {
  id: 'MK-EXTRACURRICULAR-LIFECYCLE',
  available: true,
  message: uiText.integration80c.saved,
  existingPaths: [
    '/api/v1/personal-class-requests',
    '/api/v1/personal-classes/page',
    '/api/v1/personal-classes/{id}/memberships',
  ],
} as const;
export function requireLifecycleContract() {
  return lifecycleContractDependency;
}
