// Generate a random alphanumeric room ID
export function generateRoomId(length: number = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding similar chars like 0/O, 1/I
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate a unique session ID for this browser tab
export function getSessionId(): string {
  let sessionId = sessionStorage.getItem('cs2_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('cs2_session_id', sessionId);
  }
  return sessionId;
}

// Store/retrieve nickname for a room
export function setNicknameForRoom(roomId: string, nickname: string): void {
  const key = `cs2_nickname_${roomId}`;
  localStorage.setItem(key, nickname);
}

export function getNicknameForRoom(roomId: string): string | null {
  const key = `cs2_nickname_${roomId}`;
  return localStorage.getItem(key);
}

// Copy text to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
