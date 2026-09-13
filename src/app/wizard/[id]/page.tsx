import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toClientChart } from "@/lib/charts";
import { createDefaultChart } from "@/lib/chart-create";
import { getGuestUserId, initialsOf } from "@/lib/user";
import { Wizard } from "@/components/wizard/Wizard";

export const dynamic = "force-dynamic";

export async function appBaseUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function WizardPage({ params }: PageProps<"/wizard/[id]">) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  let row = null;
  try {
    const scopedUserId = userId ?? (await getGuestUserId());
    row = scopedUserId ? await prisma.chart.findFirst({ where: { id, userId: scopedUserId } }) : null;
  } catch {
    row = null;
  }

  if (!row) {
    // No chart exists at this id for this user — rather than opening an
    // editable-looking chart that can never actually save (nothing backs
    // it in the database), create a real one and send them there instead.
    const newId = await createDefaultChart(userId);
    redirect(`/wizard/${newId}`);
  }

  const chart = toClientChart(row);
  const base = await appBaseUrl();

  return (
    <Wizard
      chart={chart}
      initials={session?.user ? initialsOf(session.user.name, session.user.email) : "GU"}
      viewerUrl={`${base}/c/${chart.id}`}
    />
  );
}
