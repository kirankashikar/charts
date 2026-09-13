"use server";

import { redirect } from "next/navigation";
import { auth, signOut } from "./auth";
import { prisma } from "./prisma";
import { DEFAULT_MAPPING, DEFAULT_SHEETS, DEFAULT_STYLE } from "./chart-types";
import { asJson } from "./json";
import { GUEST_EMAIL } from "./user";

export async function createChartAction() {
  const session = await auth();
  let userId = session?.user?.id;

  if (!userId) {
    try {
      const guestUser = await prisma.user.upsert({
        where: { email: GUEST_EMAIL },
        update: {},
        create: {
          email: GUEST_EMAIL,
          name: "Guest Presenter",
        },
      });
      userId = guestUser.id;
    } catch {
      // In case database is not reachable, redirect to default wizard
      redirect("/wizard/demo");
    }
  }

  const chart = await prisma.chart.create({
    data: {
      userId,
      name: DEFAULT_STYLE.title,
      chartType: "sankey",
      sheets: asJson(DEFAULT_SHEETS),
      mapping: asJson(DEFAULT_MAPPING),
      style: asJson(DEFAULT_STYLE),
    },
  });
  redirect(`/wizard/${chart.id}`);
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
