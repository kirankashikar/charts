"use server";

import { redirect } from "next/navigation";
import { auth, signOut } from "./auth";
import { prisma } from "./prisma";
import { DEFAULT_MAPPING, DEFAULT_SHEETS, DEFAULT_STYLE } from "./chart-types";
import { asJson } from "./json";

export async function createChartAction() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const chart = await prisma.chart.create({
    data: {
      userId: session.user.id,
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
