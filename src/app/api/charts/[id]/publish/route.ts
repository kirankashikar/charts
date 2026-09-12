import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toClientChart, toSnapshot } from "@/lib/charts";
import { asJson } from "@/lib/json";

type Params = { params: Promise<{ id: string }> };

/**
 * Freezes the current draft as version N+1. The viewer URL a slide links to
 * always reads the newest published version, so a deck never shows a chart the
 * author was still editing.
 */
export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const chart = await prisma.chart.findFirst({ where: { id, userId: session.user.id } });
  if (!chart) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const client = toClientChart(chart);
  const version = chart.version + 1;

  const [, updated] = await prisma.$transaction([
    prisma.chartVersion.create({
      data: { chartId: chart.id, version, snapshot: asJson(toSnapshot(client)) },
    }),
    prisma.chart.update({ where: { id: chart.id }, data: { version } }),
  ]);

  return NextResponse.json({ chart: toClientChart(updated), version });
}
