export type ParentDocument = {
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
};
