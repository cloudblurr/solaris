/**
 * lib/cloudreve.ts
 * All Cloudreve v3 API integration for NimbusAI.
 * Uses fetch only — no Axios.
 */

import crypto from 'crypto';

const BASE = process.env.CLOUDREVE_URL!;
const ADMIN_EMAIL = process.env.CLOUDREVE_ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.CLOUDREVE_ADMIN_PASSWORD!;
const GROUP_ID = Number(process.env.CLOUDREVE_NIMBUS_GROUP_ID ?? '4');
const USER_SECRET = process.env.CLOUDREVE_USER_SECRET!;

// ── Admin token cache ─────────────────────────────────────────────────────────
let _adminToken: string | null = null;
let _adminTokenExpiry = 0;

export async function getAdminToken(): Promise<string> {
  if (_adminToken && Date.now() < _adminTokenExpiry) return _adminToken;

  const res = await fetch(`${BASE}/api/v3/user/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName: ADMIN_EMAIL, Password: ADMIN_PASSWORD }),
  });

  const data = await res.json();
  if (data.code !== 0) throw new Error(`Cloudreve admin auth failed: ${data.msg}`);

  _adminToken = data.data; // session token string
  _adminTokenExpiry = Date.now() + 55 * 60 * 1000; // 55 min TTL
  return _adminToken!;
}

// ── Derive deterministic per-user password ────────────────────────────────────
export function deriveUserPassword(userId: string): string {
  return crypto
    .createHash('sha256')
    .update(userId + USER_SECRET)
    .digest('hex');
}

// ── Provision a new Cloudreve user on first NimbusAI login ───────────────────
export async function provisionCloudreveUser(user: {
  id: string;
  email: string;
  name: string;
}): Promise<{ token: string; uid: string } | null> {
  try {
    const adminToken = await getAdminToken();
    const password = deriveUserPassword(user.id);

    // 1. Check if user already exists
    const searchRes = await fetch(
      `${BASE}/api/v3/admin/user?page=1&page_size=10&order_by=id&order=asc&search=${encodeURIComponent(user.email)}`,
      { headers: { Cookie: `cloudreve-session=${adminToken}` } }
    );
    const searchData = await searchRes.json();
    let cloudreveUid: string | null = null;

    if (searchData.code === 0 && searchData.data?.users?.length > 0) {
      const existing = searchData.data.users.find(
        (u: { email: string; id: number }) => u.email === user.email
      );
      if (existing) cloudreveUid = String(existing.id);
    }

    // 2. Create user if not found
    if (!cloudreveUid) {
      const createRes = await fetch(`${BASE}/api/v3/admin/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `cloudreve-session=${adminToken}`,
        },
        body: JSON.stringify({
          email: user.email,
          nick: user.name,
          password,
          group_id: GROUP_ID,
          status: 'active',
        }),
      });
      const createData = await createRes.json();
      if (createData.code !== 0) throw new Error(`Create user failed: ${createData.msg}`);
      cloudreveUid = String(createData.data?.id ?? createData.data);
    }

    // 3. Ensure user is in NimbusFiles group
    await fetch(`${BASE}/api/v3/admin/user/${cloudreveUid}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `cloudreve-session=${adminToken}`,
      },
      body: JSON.stringify({ group_id: GROUP_ID }),
    });

    // 4. Get user session token
    const sessionRes = await fetch(`${BASE}/api/v3/user/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName: user.email, Password: password }),
    });
    const sessionData = await sessionRes.json();
    if (sessionData.code !== 0) throw new Error(`User session failed: ${sessionData.msg}`);
    const token: string = sessionData.data;

    // 5. Pre-create folders
    const folders = ['gallery', 'projects', 'conversations', 'uploads'];
    for (const folder of folders) {
      await fetch(`${BASE}/api/v3/directory`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `cloudreve-session=${token}`,
        },
        body: JSON.stringify({ path: `/${folder}` }),
      }).catch(() => {}); // ignore if already exists
    }

    return { token, uid: cloudreveUid! };
  } catch (err) {
    console.error('[Cloudreve] provisionCloudreveUser error:', err);
    return null;
  }
}

// ── Get (and refresh if needed) a user Cloudreve token ───────────────────────
export async function getCloudreveToken(
  userId: string,
  email: string,
  storedToken: string | null
): Promise<string | null> {
  // Validate stored token
  if (storedToken) {
    try {
      const res = await fetch(`${BASE}/api/v3/user/me`, {
        headers: { Cookie: `cloudreve-session=${storedToken}` },
      });
      const data = await res.json();
      if (data.code === 0) return storedToken;
    } catch {}
  }

  // Re-authenticate
  try {
    const password = deriveUserPassword(userId);
    const res = await fetch(`${BASE}/api/v3/user/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName: email, Password: password }),
    });
    const data = await res.json();
    if (data.code !== 0) return null;
    return data.data as string;
  } catch {
    return null;
  }
}

// ── Upload AI-generated content to Cloudreve ─────────────────────────────────
// NOTE: This is for AI outputs, conversations, and projects — NOT user uploads.
export async function uploadFile(
  token: string,
  folder: string,
  fileName: string,
  content: string | Buffer,
  mimeType: string
): Promise<{ path: string; url: string } | null> {
  try {
    const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
    const filePath = `/${folder}/${fileName}`;

    // Cloudreve v3 upload: PUT /api/v3/file/upload/{path}
    const res = await fetch(
      `${BASE}/api/v3/file/upload${filePath}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': mimeType,
          'Content-Length': String(buffer.length),
          Cookie: `cloudreve-session=${token}`,
        },
        body: new Uint8Array(buffer),
      }
    );

    const data = await res.json();
    if (data.code !== 0) {
      console.error('[Cloudreve] upload error:', data.msg);
      return null;
    }

    return {
      path: filePath,
      url: `${BASE}/api/v3/file/download${filePath}`,
    };
  } catch (err) {
    console.error('[Cloudreve] uploadFile error:', err);
    return null;
  }
}

// ── List files in a folder ────────────────────────────────────────────────────
export async function listFiles(
  token: string,
  folder: string
): Promise<{ objects: CloudreveObject[]; parent: string } | null> {
  try {
    const res = await fetch(
      `${BASE}/api/v3/directory?path=/${encodeURIComponent(folder)}`,
      { headers: { Cookie: `cloudreve-session=${token}` } }
    );
    const data = await res.json();
    if (data.code !== 0) return null;
    return {
      objects: data.data?.objects ?? [],
      parent: data.data?.parent ?? `/${folder}`,
    };
  } catch {
    return null;
  }
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

// ── Save a conversation to /conversations/{id}.json ───────────────────────────
export async function saveConversation(
  token: string,
  conversationId: string,
  messages: unknown[]
): Promise<boolean> {
  const json = JSON.stringify({ id: conversationId, savedAt: new Date().toISOString(), messages }, null, 2);
  const result = await uploadFile(token, 'conversations', `${conversationId}.json`, json, 'application/json');
  return result !== null;
}
