"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [apiHealth, setApiHealth] = useState<string>("checking...");
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";
    fetch(`${base}/health`).then(async r => {
      const j = await r.json();
      setApiHealth(j.ok ? "ok" : "down");
    }).catch(() => setApiHealth("down"));
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>Smart Interview Coach</h1>
      <p>Frontend: Next.js | Backend: Express | NLP: AWS</p>
      <p>API health: <b>{apiHealth}</b></p>
    </main>
  );
}
