import { prisma } from "./prisma";
import { DEFAULT_MAPPING, DEFAULT_SHEETS, DEFAULT_STYLE } from "./chart-types";
import { asJson } from "./json";
import { GUEST_EMAIL } from "./user";

/** Resolves a signed-in user id, or upserts and returns the shared guest
 *  account's id when there isn't one. */
export async function resolveOwnerUserId(sessionUserId: string | undefined): Promise<string> {
  if (sessionUserId) return sessionUserId;
  const guestUser = await prisma.user.upsert({
    where: { email: GUEST_EMAIL },
    update: {},
    create: { email: GUEST_EMAIL, name: "Guest Presenter" },
  });
  return guestUser.id;
}

/** Creates a fresh chart with no type chosen yet — the wizard's Chart step
 *  seeds real data and a title once the user actually picks one, rather
 *  than pre-filling a sankey funnel nobody asked for. */
export async function createDefaultChart(sessionUserId: string | undefined): Promise<string> {
  const userId = await resolveOwnerUserId(sessionUserId);
  const chart = await prisma.chart.create({
    data: {
      userId,
      name: "Untitled chart",
      chartType: "",
      sheets: asJson(DEFAULT_SHEETS),
      mapping: asJson(DEFAULT_MAPPING),
      style: asJson({ ...DEFAULT_STYLE, title: "Untitled chart", subtitle: "" }),
    },
  });
  return chart.id;
}
