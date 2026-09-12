import type { CSSProperties } from "react";

/** The prototype's three inline control skins, as React style objects. */

export const tabBtn = (on: boolean): CSSProperties => ({
  background: on ? "var(--color-bg)" : "transparent",
  border: 0,
  borderBottom: on ? "3px solid #ec3013" : "3px solid transparent",
  padding: "8px 14px",
  fontFamily: "var(--font-heading)",
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
  color: on ? "#201e1d" : "#7d7979",
});

export const segBtn = (on: boolean): CSSProperties => ({
  background: on ? "#201e1d" : "transparent",
  color: on ? "#f3f2f2" : "#201e1d",
  border: 0,
  padding: "6px 12px",
  fontFamily: "var(--font-heading)",
  fontWeight: 800,
  fontSize: 11.5,
  cursor: "pointer",
});

export const chipBtn = (on: boolean): CSSProperties => ({
  background: on ? "#ec3013" : "transparent",
  color: on ? "#f3f2f2" : "#201e1d",
  border: `1px solid ${on ? "#ec3013" : "var(--color-divider)"}`,
  padding: "5px 10px",
  fontSize: 12,
  fontFamily: "var(--font-heading)",
  fontWeight: 800,
  cursor: "pointer",
});

export const cardBtn = (on: boolean, disabled = false): CSSProperties => ({
  textAlign: "left",
  background: on ? "var(--color-surface)" : "transparent",
  border: on ? "2px solid #ec3013" : "1px solid var(--color-divider)",
  padding: 14,
  cursor: "pointer",
  opacity: disabled ? 0.55 : 1,
  display: "block",
  width: "100%",
});

export const kicker: CSSProperties = {
  fontFamily: "var(--font-heading)",
  fontWeight: 800,
  fontSize: 12,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};
