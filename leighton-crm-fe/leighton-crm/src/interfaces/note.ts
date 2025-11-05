export interface Note {
  id: string;
  title: string;
  content: string;
  entityType: string;
  filename?: string;
  attachmentKey?: string;
}
