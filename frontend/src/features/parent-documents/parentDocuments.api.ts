import { apiRequest } from '../../services/api/apiClient';

export type ParentDocuments = {
  children: { id: string; displayName: string | null }[];
  child: { id: string; displayName: string };
  documents: {
    id: string;
    child: { id: string; displayName: string };
    uploader: { displayName: string };
    purpose: 'PARENT_PROVIDED_SUPPORTING_DOCUMENT';
    displayName: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
    binaryAvailable: boolean;
  }[];
  binaryStorageAvailable: boolean;
};

export const parentDocumentsApi = {
  get: (token: string, childId?: string) =>
    apiRequest<ParentDocuments>(`/parent/documents${childId ? `?childId=${childId}` : ''}`, {
      accessToken: token,
    }),
};
