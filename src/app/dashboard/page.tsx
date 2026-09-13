import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/TopBar";
import { getGuestUserId, initialsOf } from "@/lib/user";
import { createChartAction } from "@/lib/actions";
import { toClientChart, toSnapshot } from "@/lib/charts";
import { paletteColors, thumbnailBars } from "@/lib/chart-builder";
import { chartDef } from "@/lib/chart-types";
import { relativeTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await auth();
  const userId = session?.user?.id;

  let charts: Array<Awaited<ReturnType<typeof prisma.chart.findMany>>[number]> = [];
  try {
    const scopedUserId = userId ?? (await getGuestUserId());
    if (scopedUserId) {
      charts = await prisma.chart.findMany({
        where: { userId: scopedUserId },
        orderBy: { updatedAt: "desc" },
      });
    }
  } catch {
    charts = [];
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-bg)",
        color: "var(--color-text)",
        fontFamily: "var(--font-body)",
      }}
    >
      <TopBar title="Workspace" initials={session?.user ? initialsOf(session.user.name, session.user.email) : "GU"} />

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px 80px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#7d7979",
                fontFamily: "var(--font-heading)",
                fontWeight: 800,
              }}
            >
              Workspace
            </div>
            <h1 style={{ fontSize: "clamp(32px,4vw,46px)", margin: "4px 0 0" }}>My charts</h1>
          </div>
          <form action={createChartAction}>
            <button type="submit" className="btn btn-primary" style={{ padding: "12px 18px" }}>
              ＋ New chart
            </button>
          </form>
        </div>
        <hr className="hr" style={{ margin: 0 }} />

        {charts.length === 0 ? (
          <p style={{ fontSize: 14, color: "#605d5d", marginTop: 24, maxWidth: "56ch" }}>
            Nothing here yet. A new chart starts on a sample sheet you can overwrite — type in the grid or paste a block
            straight from Excel, and the preview redraws as you go.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,260px),1fr))",
              borderLeft: "1px solid var(--color-divider)",
              borderTop: 0,
            }}
          >
            {charts.map((row) => {
              const chart = toClientChart(row);
              const snapshot = toSnapshot(chart);
              const colors = paletteColors(chart.style);
              const published = chart.version > 0;
              return (
                <Link
                  key={chart.id}
                  href={`/wizard/${chart.id}`}
                  className="dash-card"
                  style={{
                    borderRight: "1px solid var(--color-divider)",
                    borderBottom: "1px solid var(--color-divider)",
                    padding: 18,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    cursor: "pointer",
                    background: "var(--color-bg)",
                    color: "inherit",
                    textDecoration: "none",
                  }}
                >
                  <div
                    style={{
                      height: 104,
                      background: "var(--color-surface)",
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 4,
                      padding: 12,
                    }}
                  >
                    {thumbnailBars(snapshot).map((h, j) => (
                      <div
                        key={j}
                        style={{
                          flex: 1,
                          height: `${h}%`,
                          background: colors[j % colors.length],
                          opacity: 0.35 + 0.1 * j,
                        }}
                      />
                    ))}
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>
                      {chart.name}
                    </div>
                    <div style={{ fontSize: 12, color: "#7d7979", marginTop: 4 }}>
                      Edited {relativeTime(chart.updatedAt)}
                      {published ? ` · v${chart.version}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span className="tag tag-outline" style={{ fontSize: 11 }}>
                      {chartDef(chart.chartType).name}
                    </span>
                    <span className={published ? "tag tag-accent" : "tag tag-neutral"} style={{ fontSize: 11 }}>
                      {published ? "Published" : "Draft"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
