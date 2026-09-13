import { prisma } from "./prisma";

/** The shared account instant "guest mode" charts are created under. */
export const GUEST_EMAIL = "guest@fluidpalette.com";

/** The guest account's id, or null if no guest chart has ever been created. */
export async function getGuestUserId(): Promise<string | null> {
  const guest = await prisma.user.findUnique({ where: { email: GUEST_EMAIL }, select: { id: true } });
  return guest?.id ?? null;
}

export function initialsOf(name?: string | null, email?: string | null): string {
  const source = (name || email || "?").trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}
