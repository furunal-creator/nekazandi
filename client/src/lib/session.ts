// Session management for guest users
let sessionId: string | null = null;

export function getSessionId(): string {
  if (!sessionId) {
    sessionId = "guest_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  return sessionId;
}
