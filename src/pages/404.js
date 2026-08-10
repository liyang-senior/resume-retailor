import Head from "next/head";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <>
      <Head>
        <title>404 — Resume Tailor</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#0f172a",
          color: "#f1f5f9",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "2rem", margin: "0 0 12px 0" }}>404</h1>
        <p style={{ margin: "0 0 24px 0", color: "#94a3b8", maxWidth: 420 }}>
          This page is not available. Check that you opened the correct link
          (including any access token in the URL).
        </p>
        <Link
          href="/"
          style={{
            color: "#60a5fa",
            textDecoration: "underline",
            fontWeight: 500,
          }}
        >
          Back to home
        </Link>
      </div>
    </>
  );
}
