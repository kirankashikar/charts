import type { Prisma } from "@prisma/client";

/** Structural objects (sheets, mapping, style, snapshots) written to Json columns. */
export function asJson(value: unknown): Prisma.InputJsonObject {
  return value as Prisma.InputJsonObject;
}
