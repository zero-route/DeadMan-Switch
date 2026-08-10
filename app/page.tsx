"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Status = {
  last_checkin: string;
  threshold_hours: number;
  triggered: boolean;
  deadline: string;
};

function formatRemaining(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return days > 0
    ? `${days}h ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export default function Home() {
  const [status, setStatus] = useState<Status | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/status");
    if (res.ok) setStatus(await res.json());
  }, []);

  useEffect(() => {
    fetchStatus();
    const poll = setInterval(fetchStatus, 30000);
    return () => clearInterval(poll);
  }, [fetchStatus]);

  useEffect(() => {
    if (!status) return;
    const tick = () => setRemaining(new Date(status.deadline).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status]);

  async function handleCheckin() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Gagal absen.");
      } else {
        setMessage("Absen tercatat. Jam mundur direset.");
        setPin("");
        fetchStatus();
      }
    } catch {
      setMessage("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }

  const triggered = status?.triggered;
  const isUrgent = !triggered && remaining < 1000 * 60 * 60 * 3;

  return (
    <main className="screen">
      <div className="panel">
        <p className="eyebrow">Deadman Switch</p>
        <h1 className={triggered ? "status-triggered" : "status-armed"}>
          {triggered ? "TRIGGERED — file terkirim" : "ARMED — menunggu absen"}
        </h1>

        <div className="pulse-wrap">
          <svg
            className={`pulse-line ${triggered ? "flat" : ""}`}
            viewBox="0 0 400 56"
            preserveAspectRatio="none"
          >
            <polyline
              points="0,28 40,28 55,8 70,48 85,28 200,28 240,28 255,8 270,48 285,28 400,28 440,28 455,8 470,48 485,28 600,28 640,28 655,8 670,48 685,28 800,28"
              fill="none"
              stroke={triggered ? "var(--warn)" : "var(--calm)"}
              strokeWidth="2"
            />
          </svg>
        </div>

        {status && (
          <>
            <div className="countdown mono" style={{ color: isUrgent ? "var(--warn)" : "var(--text)" }}>
              {triggered ? "--:--:--" : formatRemaining(remaining)}
            </div>
            <p className="countdown-label">
              sisa waktu sebelum switch aktif · absen terakhir{" "}
              {new Date(status.last_checkin).toLocaleString("id-ID")}
            </p>
          </>
        )}

        <hr className="divider" />

        <label className="field-label" htmlFor="pin">
          PIN
        </label>
        <input
          id="pin"
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Masukkan PIN"
          onKeyDown={(e) => e.key === "Enter" && handleCheckin()}
        />
        <button onClick={handleCheckin} disabled={loading || !pin}>
          {loading ? "Memproses..." : "Absen Sekarang"}
        </button>

        {message && <p className="message">{message}</p>}

        <Link href="/admin" className="foot-link">
          Kelola file & pengaturan →
        </Link>
      </div>
    </main>
  );
}
