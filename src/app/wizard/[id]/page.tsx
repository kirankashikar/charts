import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toClientChart } from "@/lib/charts";
import { initialsOf } from "@/lib/user";
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
  if (!session?.user?.id) redirect("/");

  const row = await prisma.chart.findFirst({ where: { id, userId: session.user.id } });
  if (!row) notFound();

  const chart = toClientChart(row);
  const base = await appBaseUrl();

  return (
    <Wizard
      chart={chart}
      initials={initialsOf(session.user.name, session.user.email)}
      viewerUrl={`${base}/c/${chart.id}`}
    />
  );
}
