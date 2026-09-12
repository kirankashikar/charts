"use client";

import { useState } from "react";
import type { Access } from "@prisma/client";
import { ACCESS_LABELS } from "@/lib/charts";
import type { Scene } from "@/lib/chart-builder";
import { groundColors } from "@/lib/chart-builder";
import { ChartSvg } from "@/components/ChartSvg";
import { segBtn } from "./controls";
import { relativeTime } from "@/lib/time";
import type { StepProps } from "./types";

const EMBED_OPTIONS = [
  {
    id: "viewer",
    name: "Viewer link",
    badge: "Recommended",
    note: "A still of the chart sits on the slide; clicking it in Slide Show opens the live, interactive viewer in the browser. Nothing to install.",
  },
  {
    id: "snapshot",
    name: "Refreshing still",
    badge: "Offline-safe",
    note: "A PNG re-exported on every publish. Drop it in and re-paste after each version — no network needed in the room.",
  },
  {
    id: "iframe",
    name: "Web-page embed",
    badge: "Web decks",
    note: "An iframe snippet for Google Slides add-ons, Notion, Confluence or a web-hosted deck.",
  },
];

const PPT_STEPS = [
  "Download the slide PNG and place it on the slide.",
  "Select the image → Insert → Link, and paste the viewer URL.",
  "In Slide Show, one click opens the live chart in the default browser.",
  "Republish any time — the link keeps working, the data is current.",
];

export function PublishStep({
  chart,
  update,
  scene,
  viewerUrl,
  onPublish,
  publishing,
}: StepProps & {
  scene: Scene;
  viewerUrl: string;
  onPublish: () => void;
  publishing: boolean;
}) {
  const [copied, setCopied] = useState<"link" | "iframe" | null>(null);
  const published = chart.version > 0;
  const ground = groundColors(chart.style.ground);

  const copy = async (text: string, what: "link" | "iframe") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div style={{ padding: "24px 28px 40px" }}>
      <h2 style={{ fontSize: 26, margin: 0 }}>Publish &amp; put it on a slide</h2>
      <p style={{ fontSize: 13, color: "#605d5d", margin: "4px 0 20px", maxWidth: "62ch" }}>
        Publishing writes a versioned snapshot and serves it from a static viewer URL. PowerPoint only ever needs a
        hyperlink.
      </p>

      <div style={{ border: "2px solid var(--color-divider)", padding: 16, marginBottom: 20 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#7d7979",
            fontFamily: "var(--font-heading)",
            fontWeight: 800,
            marginBottom: 8,
          }}
        >
          Live link
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <code
            style={{
              flex: "1 1 260px",
              fontFamily: "ui-monospace,monospace",
              fontSize: 13,
              background: "var(--color-surface)",
              padding: "10px 12px",
              overflow: "auto",
              whiteSpace: "nowrap",
            }}
          >
            {viewerUrl}
          </code>
          <button className="btn btn-primary" onClick={onPublish} disabled={publishing}>
            {publishing ? "Publishing…" : published ? `Publish v${chart.version + 1}` : "Publish"}
          </button>
          <button className="btn btn-secondary" onClick={() => copy(viewerUrl, "link")} disabled={!published}>
            {copied === "link" ? "✓ Copied" : "Copy link"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 14, flexWrap: "wrap", fontSize: 12, color: "#605d5d" }}>
          <span>
            Version <strong>{published ? `v${chart.version}` : "unpublished"}</strong>
          </span>
          <span>Updated {relativeTime(chart.updatedAt)}</span>
          <span>
            Access: <strong>{ACCESS_LABELS[chart.access]}</strong>
          </span>
        </div>
        {!published && (
          <div style={{ fontSize: 12, color: "#7c1405", marginTop: 8 }}>
            The link goes live the first time you publish — until then only you can open it.
          </div>
        )}
        <div
          style={{
            display: "flex",
            gap: 2,
            marginTop: 12,
            border: "1px solid var(--color-divider)",
            width: "fit-content",
            maxWidth: "100%",
            flexWrap: "wrap",
          }}
        >
          {(Object.keys(ACCESS_LABELS) as Access[]).map((key) => (
            <button key={key} onClick={() => update({ access: key })} style={segBtn(chart.access === key)}>
              {ACCESS_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          fontFamily: "var(--font-heading)",
          fontWeight: 800,
          fontSize: 12,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        How it lands in the deck
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,230px),1fr))",
          gap: 10,
          marginBottom: 24,
        }}
      >
        {EMBED_OPTIONS.map((option) => {
          const on = option.id === chart.embed;
          return (
            <button
              key={option.id}
              onClick={() => update({ embed: option.id })}
              style={{
                textAlign: "left",
                background: on ? "var(--color-surface)" : "transparent",
                border: on ? "2px solid #ec3013" : "1px solid var(--color-divider)",
                padding: 14,
                cursor: "pointer",
                display: "block",
                width: "100%",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 13.5 }}>{option.name}</span>
                <span
                  style={{
                    fontSize: 9.5,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontFamily: "var(--font-heading)",
                    fontWeight: 800,
                    padding: "2px 6px",
                    background: on ? "#ec3013" : "var(--color-neutral-300)",
                    color: on ? "#f3f2f2" : "#444141",
                    whiteSpace: "nowrap",
                  }}
                >
                  {option.badge}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: "#605d5d", marginTop: 6, lineHeight: 1.4 }}>{option.note}</div>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Slide preview
          </div>
          <div
            style={{
              border: "2px solid var(--color-divider)",
              background: "#fff",
              aspectRatio: "16/9",
              padding: "18px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              position: "relative",
            }}
          >
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 15, lineHeight: 1.1 }}>
              {chart.style.title}
            </div>
            <div
              style={{
                flex: 1,
                minHeight: 0,
                border: "1px solid #d7d3d3",
                position: "relative",
                overflow: "hidden",
                background: ground.groundBg,
              }}
            >
              <ChartSvg scene={scene} style={{ height: "100%" }} />
              <div
                style={{
                  position: "absolute",
                  right: 8,
                  bottom: 8,
                  background: "#ec3013",
                  color: "#f3f2f2",
                  fontFamily: "var(--font-heading)",
                  fontWeight: 800,
                  fontSize: 9,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "4px 8px",
                }}
              >
                ▶ Open live chart
              </div>
            </div>
            <div style={{ fontSize: 9, color: "#9b9797", fontFamily: "ui-monospace,monospace" }}>{viewerUrl}</div>
          </div>
        </div>

        <div style={{ flex: "1 1 260px" }}>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Steps in PowerPoint
          </div>
          {PPT_STEPS.map((text, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderTop: "1px solid var(--color-divider)" }}>
              <div
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 800,
                  fontSize: 12,
                  color: "#ec3013",
                  width: 16,
                  flex: "none",
                }}
              >
                {i + 1}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.45, color: "#444141" }}>{text}</div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <a className="btn btn-secondary" href={`/api/charts/${chart.id}/image?download=1`}>
              Download slide PNG
            </a>
            <button
              className="btn btn-secondary"
              onClick={() =>
                copy(`<iframe src="${viewerUrl}?embed=1" width="800" height="520" frameborder="0"></iframe>`, "iframe")
              }
            >
              {copied === "iframe" ? "✓ Copied" : "Copy iframe"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
