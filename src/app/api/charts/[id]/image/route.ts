import { NextResponse } from "next/server";
import sharp from "sharp";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildScene, sceneToSvg } from "@/lib/chart-builder";
import { canView, snapshotFromJson, toClientChart, toSnapshot } from "@/lib/charts";
import { getGuestUserId } from "@/lib/user";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/**
 * The still a slide carries. Rasterized server-side so PowerPoint needs no
 * add-in and no local server — just an image and a hyperlink.
 */
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const url = new URL(request.url);
  const wanted = url.searchParams.get("v");
  const download = url.searchParams.get("download") === "1";

  const chart = await prisma.chart.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true } } },
  });
  if (!chart) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await auth();
  // Consistent with the dashboard/wizard/save routes: a guest's charts are
  // owned by the shared guest account, so any guest counts as its owner —
  // otherwise a guest could never preview their own unpublished draft PNG.
  const viewerId = session?.user?.id ?? (await getGuestUserId());
  const isOwner = viewerId === chart.userId;
  if (!canView(chart.access, chart.user.email, chart.userId, viewerId, session?.user?.email ?? null)) {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  const version = wanted ? Number(wanted) : chart.version;
  const published =
    version > 0
      ? await prisma.chartVersion.findUnique({ where: { chartId_version: { chartId: chart.id, version } } })
      : null;

  if (!published && !isOwner) return NextResponse.json({ error: "Not published" }, { status: 404 });

  const snapshot = published ? snapshotFromJson(published.snapshot) : toSnapshot(toClientChart(chart));
  const svg = sceneToSvg(snapshot, buildScene(snapshot));
  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": published ? "public, max-age=300" : "no-store",
      ...(download
        ? { "Content-Disposition": `attachment; filename="${snapshot.name.replace(/[^a-z0-9]+/gi, "-")}.png"` }
        : {}),
    },
  });
}
