import type { ParentDocument } from './parent-documents.types.js';

export interface ParentDocumentsRepository {
  findParentRoleAssignmentId(userId: string, now: Date): Promise<string | null>;
  children(parentId: string): Promise<{ id: string; displayName: string | null }[]>;
  documents(childId: string): Promise<ParentDocument[] | null>;
}
