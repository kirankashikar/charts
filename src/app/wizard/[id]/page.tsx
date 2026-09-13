import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toClientChart } from "@/lib/charts";
import { DEFAULT_SHEETS, DEFAULT_MAPPING, DEFAULT_STYLE } from "@/lib/chart-types";
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
    // If not in DB, fallback to demo/default chart
    const base = await appBaseUrl();
    const demoChart = {
      id: id || "demo",
      name: "B2B SaaS Revenue Flow",
      chartType: "sankey" as const,
      engine: "builtin" as const,
      access: "LINK" as const,
      sheets: DEFAULT_SHEETS,
      mapping: DEFAULT_MAPPING,
      style: DEFAULT_STYLE,
      shell: "split" as const,
      embed: "viewer" as const,
      version: 1,
      updatedAt: new Date().toISOString(),
    };
    return (
      <Wizard
        chart={demoChart}
        initials={session?.user ? initialsOf(session.user.name, session.user.email) : "GU"}
        viewerUrl={`${base}/c/${demoChart.id}`}
      />
    );
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
