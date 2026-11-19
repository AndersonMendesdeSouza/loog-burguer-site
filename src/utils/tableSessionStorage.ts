export const TABLE_SESSION_STORAGE_KEY = "mesaId";
export const TABLE_SESSION_DURATION_MS = 20 * 60 * 1000;

export type TableSession = {
  mesaId: string;
  expiresAt: number;
};

export function createTableSession(mesaId: string, now = Date.now()): TableSession | null {
  const number = Number(mesaId.trim());
  if (!/^\d+$/.test(mesaId.trim()) || !Number.isSafeInteger(number) || number <= 0) {
    return null;
  }
  return { mesaId: String(number), expiresAt: now + TABLE_SESSION_DURATION_MS };
}

export function readTableSession(): TableSession | null {
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(TABLE_SESSION_STORAGE_KEY) || "null");
    if (!stored || typeof stored !== "object" ||
      !("mesaId" in stored) || typeof stored.mesaId !== "string" ||
      !("expiresAt" in stored) || typeof stored.expiresAt !== "number" ||
      !Number.isFinite(stored.expiresAt) || stored.expiresAt <= 0) {
      return null;
    }
    const session = createTableSession(stored.mesaId, 0);
    if (!session) return null;
    return { mesaId: session.mesaId, expiresAt: stored.expiresAt };
  } catch (error) {
    console.error("Não foi possível recuperar a identificação da mesa:", error);
    return null;
  }
}

export function isTableSessionValid(session: TableSession | null, now = Date.now()): boolean {
  return session !== null && session.expiresAt > now;
}

export function saveTableSession(session: TableSession): void {
  try {
    sessionStorage.setItem(TABLE_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.error("Não foi possível salvar a identificação da mesa:", error);
  }
}

export function clearTableSession(): void {
  try {
    sessionStorage.removeItem(TABLE_SESSION_STORAGE_KEY);
  } catch (error) {
    console.error("Não foi possível limpar a identificação da mesa:", error);
  }
}
