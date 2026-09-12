import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canView, snapshotFromJson, toClientChart, toSnapshot } from "@/lib/charts";
import { groundColors } from "@/lib/chart-builder";
import { chartDef } from "@/lib/chart-types";
import { EngineChart } from "@/components/EngineChart";
import { relativeTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/c/[id]">): Promise<Metadata> {
  const { id } = await params;
  const chart = await prisma.chart.findUnique({ where: { id }, select: { name: true, access: true } });
  if (!chart || chart.access !== "LINK") return { title: "Graphos" };
  return { title: `${chart.name} — Graphos`, openGraph: { images: [`/api/charts/${id}/image`] } };
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--color-bg)" }}>
      <div style={{ maxWidth: "44ch" }}>
        <div
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#ec3013",
          }}
        >
          Graphos
        </div>
        <h1 style={{ fontSize: 30, margin: "12px 0 8px" }}>{title}</h1>
        <p style={{ fontSize: 14, color: "#605d5d", margin: 0 }}>{body}</p>
      </div>
    </div>
  );
}

/**
 * The public viewer — the URL a slide hyperlinks to. No sign-in for link-shared
 * charts, no add-in, nothing to install: one click in Slide Show opens this.
 */
export default async function ViewerPage({ params, searchParams }: PageProps<"/c/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const embedded = query.embed === "1";

  const chart = await prisma.chart.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
  if (!chart) {
    return <Notice title="No chart here" body="This link doesn't point at a chart. It may have been deleted by its owner." />;
  }

  const session = await auth();
  const viewerId = session?.user?.id ?? null;
  const isOwner = viewerId === chart.userId;

  if (!canView(chart.access, chart.user.email, chart.userId, viewerId, session?.user?.email ?? null)) {
    return (
      <Notice
        title="Not shared with you"
        body="The owner limited who can open this chart. Ask them to widen access, or sign in with the account it was shared with."
      />
    );
  }

  const wanted = Number(query.v ?? chart.version);
  const published =
    wanted > 0
      ? await prisma.chartVersion.findUnique({ where: { chartId_version: { chartId: chart.id, version: wanted } } })
      : null;

  if (!published && !isOwner) {
    return (
      <Notice
        title="Not published yet"
        body="This chart exists but its owner hasn't published a version to this link. It will appear here as soon as they do."
      />
    );
  }

  const snapshot = published ? snapshotFromJson(published.snapshot) : toSnapshot(toClientChart(chart));
  const ground = groundColors(snapshot.style.ground);
  const version = published?.version ?? 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: ground.groundBg,
        color: ground.ink,
        fontFamily: "var(--font-body)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: embedded ? 16 : "40px 24px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 980 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: embedded ? 20 : 28, lineHeight: 1.1 }}>
            {snapshot.style.title}
          </div>
          <div style={{ fontSize: 13, color: ground.muted, marginTop: 4 }}>{snapshot.style.subtitle}</div>
          <hr
            style={{
              height: 2,
              border: 0,
              margin: "14px 0",
              background: ground.dark ? "#605d5d" : "var(--color-divider)",
            }}
          />
          <EngineChart snapshot={snapshot} />
          <div
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              marginTop: 16,
              fontSize: 11,
              color: ground.muted,
            }}
          >
            <span>{chartDef(snapshot.chartType).name}</span>
            <span>{version > 0 ? `v${version}` : "draft preview"}</span>
            <span>Updated {relativeTime(published?.createdAt ?? chart.updatedAt)}</span>
            {!embedded && <span style={{ marginLeft: "auto" }}>Graphos</span>}
          </div>
          {isOwner && !published && (
            <div style={{ fontSize: 12, color: "#ec3013", marginTop: 12 }}>
              Only you can see this — publish a version to make the link live for everyone it&apos;s shared with.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
