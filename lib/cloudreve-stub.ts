/**
 * lib/cloudreve-stub.ts
 * Stub implementation for removed Cloudreve functionality.
 * These functions are no-ops to maintain compatibility with existing code.
 */

export async function provisionUserFolders(_userId: string): Promise<void> {
  // No-op: Cloudreve integration removed
  return Promise.resolve();
}

export async function uploadFile(
  _userId: string,
  _folder: string,
  _fileName: string,
  _content: string | Buffer,
  _mimeType: string
): Promise<{ path: string; url: string } | null> {
  // No-op: Cloudreve integration removed
  console.warn('[Cloudreve] Upload attempted but Cloudreve integration is disabled');
  return null;
}

export async function listFiles(
  _userId: string,
  _folder: string
): Promise<{ objects: CloudreveObject[]; parent: string } | null> {
  // No-op: Cloudreve integration removed
  console.warn('[Cloudreve] List files attempted but Cloudreve integration is disabled');
  return { objects: [], parent: '' };
}

export async function saveConversation(
  _userId: string,
  _conversationId: string,
  _messages: unknown[]
): Promise<boolean> {
  // No-op: Cloudreve integration removed
  return false;
}

export interface CloudreveObject {
  id: string;
  name: string;
  path: string;
  size: number;
  type: 'file' | 'dir';
  date: string;
  thumb: boolean;
}
