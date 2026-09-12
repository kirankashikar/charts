"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAction } from "@/lib/actions";

export function TopBar({
  title,
  initials,
  shellToggle,
}: {
  title: string;
  initials: string;
  shellToggle?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "0 24px",
        height: 60,
        borderBottom: "2px solid var(--color-divider)",
        background: "var(--color-bg)",
        position: "sticky",
        top: 0,
        zIndex: 20,
        flexWrap: "wrap",
      }}
    >
      <Link
        href="/dashboard"
        style={{
          fontFamily: "var(--font-heading)",
          fontWeight: 800,
          fontSize: 14,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "inherit",
          textDecoration: "none",
        }}
      >
        Graphos
      </Link>
      <div style={{ width: 2, height: 24, background: "var(--color-divider)" }} />
      <div
        style={{
          fontSize: 13,
          color: "#605d5d",
          flex: "1 1 120px",
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </div>
      {shellToggle}
      <Link className="btn btn-secondary" href="/dashboard">
        My charts
      </Link>
      <form action={signOutAction}>
        <button
          type="submit"
          title="Sign out"
          style={{
            width: 32,
            height: 32,
            background: "#201e1d",
            color: "#f3f2f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-heading)",
            fontWeight: 800,
            fontSize: 12,
            border: 0,
            cursor: "pointer",
            padding: 0,
          }}
        >
          {initials}
        </button>
      </form>
    </div>
  );
}
