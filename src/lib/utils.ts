/** Generate a UUID using the browser's crypto API */
export function generateId(): string {
  return crypto.randomUUID();
}

/** Get the start of today (midnight) */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
