const BLOCKED = new Set([
  "nigger",
  "nigga",
  "faggot",
  "retard",
  "pedo",
  "hitler",
  "nazi",
  "kike",
  "tranny",
  "rapist",
]);

export function sanitizeName(raw: string): string | null {
  const trimmed = raw.replace(/[^\p{L}\p{N} _'-]/gu, " ").replace(/\s+/g, " ").trim();
  if (trimmed.length < 2 || trimmed.length > 16) return null;
  if (/https?:|www\.|\.com\b|\.tv\b|\.gg\b/i.test(trimmed)) return null;
  if (/(.)\1{4,}/.test(trimmed)) return null;
  const key = trimmed
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]/g, "");
  if (!key) return null;
  for (const bad of BLOCKED) {
    const b = bad.trim();
    if (b && key.includes(b)) return null;
  }
  return trimmed;
}
