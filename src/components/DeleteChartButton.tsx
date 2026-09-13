"use client";

import { useState, useTransition } from "react";
import { deleteChartAction } from "@/lib/actions";

/** Sits as a sibling over the dashboard card's own <Link>, not inside it —
 *  a <button> nested in an <a> would also trigger navigation on click. */
export function DeleteChartButton({ id, name }: { id: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (confirming) {
    return (
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 2,
          background: "#201e1d",
          color: "#f3f2f2",
          padding: "8px 10px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 11.5,
          maxWidth: 200,
        }}
      >
        <span>Delete this chart?</span>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => deleteChartAction(id))}
          style={{
            background: "#ec3013",
            color: "#f3f2f2",
            border: 0,
            padding: "3px 8px",
            fontSize: 11,
            fontWeight: 800,
            cursor: pending ? "default" : "pointer",
          }}
        >
          {pending ? "…" : "Yes"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          style={{ background: "none", color: "#bab6b6", border: 0, fontSize: 11, cursor: "pointer" }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      title={`Delete "${name}"`}
      onClick={() => setConfirming(true)}
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        zIndex: 2,
        width: 26,
        height: 26,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-bg)",
        border: "1px solid var(--color-divider)",
        color: "#7d7979",
        cursor: "pointer",
        fontSize: 13,
        padding: 0,
      }}
    >
      ✕
    </button>
  );
}
