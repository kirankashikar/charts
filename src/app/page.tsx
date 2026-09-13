import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-bg)",
        color: "var(--color-text)",
        fontFamily: "var(--font-body)",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", minHeight: "100vh" }}>
        <div
          style={{
            flex: "1 1 420px",
            background: "#ec3013",
            color: "#f3f2f2",
            padding: "64px 56px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: 420,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            Graphos
          </div>
          <div>
            <h1
              style={{
                fontSize: "clamp(38px,5vw,72px)",
                lineHeight: 0.98,
                letterSpacing: "-0.03em",
                margin: "0 0 20px",
                color: "#f3f2f2",
                maxWidth: "14ch",
              }}
            >
              Data in. Chart out. Link on the slide.
            </h1>
            <p style={{ fontSize: 17, maxWidth: "46ch", margin: 0, color: "#f3f2f2", opacity: 0.92 }}>
              Twelve advanced chart types, a spreadsheet you already know how to use, and a live URL your deck can point
              at — no add-ins, no local server.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: 28,
              flexWrap: "wrap",
              fontSize: 12,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontFamily: "var(--font-heading)",
              fontWeight: 800,
            }}
          >
            <span>Sankey</span>
            <span>Sunburst</span>
            <span>Chord</span>
            <span>Marimekko</span>
            <span>Radar</span>
          </div>
        </div>
        <div style={{ flex: "1 1 420px", display: "flex", alignItems: "center", padding: "64px 56px" }}>
          <div style={{ width: "100%", maxWidth: 400 }}>
            <h2 style={{ fontSize: 30, margin: "0 0 8px" }}>Sign in</h2>
            <p style={{ fontSize: 14, color: "#605d5d", margin: "0 0 24px" }}>
              Your sheets and charts are stored against your Google account. Nothing is public until you publish it.
            </p>
            <hr className="hr" style={{ margin: "0 0 24px" }} />
            <form
              action={async () => {
                "use server";
                redirect("/dashboard");
              }}
              style={{ marginBottom: 12 }}
            >
              <button
                type="submit"
                className="btn btn-primary btn-block"
                style={{
                  justifyContent: "center",
                  gap: 10,
                  padding: "14px 16px",
                  fontSize: 15,
                  fontWeight: 800,
                  width: "100%",
                }}
              >
                Launch Chart Studio (Instant Access)
              </button>
            </form>

            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/dashboard" });
              }}
            >
              <button
                type="submit"
                className="btn btn-secondary btn-block"
                style={{
                  justifyContent: "flex-start",
                  gap: 12,
                  padding: "14px 16px",
                  borderWidth: 2,
                  borderColor: "#201e1d",
                  fontSize: 15,
                  width: "100%",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#201e1d"
                    d="M12 11v2.9h4.9a4.2 4.2 0 0 1-4.9 3.3 5.2 5.2 0 1 1 3.4-9.1l2.1-2.1A8.2 8.2 0 1 0 12 20.2c4.7 0 8-3.3 8-8 0-.5 0-.8-.1-1.2H12Z"
                  />
                </svg>
                Continue with Google
              </button>
            </form>
            <p style={{ fontSize: 12, color: "#7d7979", margin: "20px 0 0" }}>
              Instant guest mode requires no setup. Sign in with Google to save charts to your cloud workspace.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
