"use server";

import { redirect } from "next/navigation";
import { auth, signOut } from "./auth";
import { createDefaultChart } from "./chart-create";

export async function createChartAction() {
  const session = await auth();
  const id = await createDefaultChart(session?.user?.id);
  redirect(`/wizard/${id}`);
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
