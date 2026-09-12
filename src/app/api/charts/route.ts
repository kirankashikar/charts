import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toClientChart } from "@/lib/charts";
import { asJson } from "@/lib/json";
import { DEFAULT_MAPPING, DEFAULT_SHEETS, DEFAULT_STYLE } from "@/lib/chart-types";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const charts = await prisma.chart.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ charts: charts.map(toClientChart) });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

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
  return NextResponse.json({ chart: toClientChart(chart) }, { status: 201 });
}
