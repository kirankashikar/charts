export function initialsOf(name?: string | null, email?: string | null): string {
  const source = (name || email || "?").trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}
