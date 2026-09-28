export type Draft = {
  step: number;
  uri: string;
  title: string;
  description: string;
  sourceUrl: string;
  projects: string[];
  badges: string[];
};

export function draftKey(reshipOf: string | null): string {
  return `shrink:ship-draft:${reshipOf ?? "new"}`;
}

export function loadDraft(key: string): Partial<Draft> | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Partial<Draft>) : null;
  } catch {
    return null;
  }
}

export function saveDraft(key: string, draft: Draft): void {
  try {
    localStorage.setItem(key, JSON.stringify(draft));
  } catch {}
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {}
}
