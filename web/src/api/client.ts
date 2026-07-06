export function delay<T>(value: T, ms = 500): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export interface ApiEnvelope<T> {
  ok: true;
  data: T;
}

export function ok<T>(data: T): ApiEnvelope<T> {
  return { ok: true, data };
}
