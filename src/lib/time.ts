export function relativeTime(input: string | Date, now = new Date()): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const mins = Math.round((now.getTime() - date.getTime()) / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 14) return "last week";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
