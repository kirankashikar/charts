"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signOut } from "./auth";
import { createDefaultChart, resolveOwnerUserId } from "./chart-create";
import { prisma } from "./prisma";
import { getGuestUserId } from "./user";

export async function createChartAction() {
  const session = await auth();
  const id = await createDefaultChart(session?.user?.id);
  redirect(`/wizard/${id}`);
}

/** Deletes a chart from the dashboard grid. Scoped to whichever account
 *  owns it (a signed-in user, or the shared guest account) — the same
 *  ownership rule every other chart route already uses. */
export async function deleteChartAction(id: string) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getGuestUserId());
  if (!userId) return;
  await prisma.chart.deleteMany({ where: { id, userId } });
  revalidatePath("/dashboard");
}

/** Deletes a never-saved draft and sends the user back to the dashboard —
 *  the wizard's "Discard" action, for a chart abandoned before it was ever
 *  named. */
export async function discardChartAction(id: string) {
  const session = await auth();
  const userId = await resolveOwnerUserId(session?.user?.id);
  await prisma.chart.deleteMany({ where: { id, userId } });
  redirect("/dashboard");
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
