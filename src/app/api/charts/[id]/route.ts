import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  normalizeChartType,
  normalizeEngine,
  normalizeMapping,
  normalizeSheets,
  normalizeStyle,
  parseAccess,
  toClientChart,
} from "@/lib/charts";
import { asJson } from "@/lib/json";
import { getGuestUserId } from "@/lib/user";

type Params = { params: Promise<{ id: string }> };

async function ownedChart(id: string) {
  const session = await auth();
  // Instant-access charts belong to the shared guest account rather than a
  // signed-in session — without this, every autosave for a guest chart 401s
  // and edits are silently never persisted.
  const userId = session?.user?.id ?? (await getGuestUserId());
  if (!userId) return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  const chart = await prisma.chart.findFirst({ where: { id, userId } });
  if (!chart) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  return { chart, userId };
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const { chart, error } = await ownedChart(id);
  if (error) return error;
  return NextResponse.json({ chart: toClientChart(chart) });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const { chart, error } = await ownedChart(id);
  if (error) return error;

  const body = (await request.json()) as Record<string, unknown>;
  const sheets = body.sheets !== undefined ? normalizeSheets(body.sheets) : normalizeSheets(chart.sheets);
  const style = body.style !== undefined ? normalizeStyle(body.style) : normalizeStyle(chart.style);
  const access = parseAccess(body.access);
  const chartType = body.chartType !== undefined ? normalizeChartType(body.chartType) : chart.chartType;

  const updated = await prisma.chart.update({
    where: { id: chart.id },
    data: {
      sheets: asJson(sheets),
      style: asJson(style),
      name: style.title || chart.name,
      mapping: asJson(normalizeMapping(body.mapping ?? chart.mapping, sheets, chartType)),
      chartType,
      engine: body.engine !== undefined ? normalizeEngine(body.engine) : chart.engine,
      shell: body.shell === "canvas" ? "canvas" : body.shell === "split" ? "split" : chart.shell,
      embed:
        typeof body.embed === "string" && ["viewer", "snapshot", "iframe"].includes(body.embed)
          ? body.embed
          : chart.embed,
      ...(access ? { access } : {}),
    },
  });
  return NextResponse.json({ chart: toClientChart(updated) });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const { chart, error } = await ownedChart(id);
  if (error) return error;
  await prisma.chart.delete({ where: { id: chart.id } });
  return NextResponse.json({ ok: true });
}
