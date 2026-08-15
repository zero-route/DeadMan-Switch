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
    ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export default function Home() {
  const [status, setStatus] = useState<Status | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(true);

  const fetchStatus = useCallback(async () => {
    const res = await fetch(`/api/status?t=${Date.now()}`, { cache: "no-store" });
    if (res.ok) setStatus(await res.json());
  }, []);

  useEffect(() => {
    fetchStatus();
    const poll = setInterval(fetchStatus, 30000);
    return () => clearInterval(poll);
  }, [fetchStatus]);

  useEffect(() => {
    if (!status) return;
    const tickFn = () => setRemaining(new Date(status.deadline).getTime() - Date.now());
    tickFn();
    const id = setInterval(tickFn, 1000);
    return () => clearInterval(id);
  }, [status]);

  // Blink effect untuk colon di countdown
  useEffect(() => {
    const id = setInterval(() => setTick(t => !t), 500);
    return () => clearInterval(id);
  }, []);

  async function handleCheckin() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        cache: "no-store",
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
    <>
      <style>{`
        /* ── Grid background ── */
        .ds-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 16px;
          background-color: #07090d;
          background-image:
            linear-gradient(rgba(0, 210, 130, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 210, 130, 0.04) 1px, transparent 1px);
          background-size: 44px 44px;
          font-family: 'Inter', sans-serif;
        }

        /* ── Panel ── */
        .ds-panel {
          width: 100%;
          max-width: 420px;
          background: #0c0f14;
          border: 1px solid #1c2333;
          border-radius: 4px;
          padding: 28px 24px 24px;
          position: relative;
          box-shadow: 0 0 0 1px #0f1520, 0 24px 48px rgba(0,0,0,0.6);
        }

        /* corner accent kiri atas */
        .ds-panel::before {
          content: '';
          position: absolute;
          top: -1px; left: -1px;
          width: 20px; height: 20px;
          border-top: 2px solid #00d082;
          border-left: 2px solid #00d082;
          border-radius: 3px 0 0 0;
        }

        /* corner accent kanan bawah */
        .ds-panel::after {
          content: '';
          position: absolute;
          bottom: -1px; right: -1px;
          width: 20px; height: 20px;
          border-bottom: 2px solid #1c2333;
          border-right: 2px solid #1c2333;
          border-radius: 0 0 3px 0;
        }

        .ds-panel.urgent {
          border-color: #3d1414;
          box-shadow: 0 0 0 1px #1a0a0a, 0 0 32px rgba(220,38,38,0.08), 0 24px 48px rgba(0,0,0,0.6);
        }

        .ds-panel.urgent::before {
          border-color: #dc2626;
        }

        /* ── Eyebrow ── */
        .ds-eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.18em;
          color: #3d5066;
          text-transform: uppercase;
          margin: 0 0 10px;
        }

        /* ── Status heading ── */
        .ds-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.04em;
          margin: 0 0 20px;
        }

        .ds-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .ds-dot.armed {
          background: #00d082;
          box-shadow: 0 0 6px #00d082;
          animation: pulse-dot 2s ease-in-out infinite;
        }

        .ds-dot.triggered {
          background: #dc2626;
          box-shadow: 0 0 6px #dc2626;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .ds-status.armed { color: #00d082; }
        .ds-status.triggered { color: #dc2626; }

        /* ── EKG pulse line ── */
       .ds-pulse {
  margin: 0 0 20px;
  height: 36px;
  overflow: hidden;
}

.ds-pulse-anim {
  animation: ekg-scroll 3.5s linear infinite;
}

@keyframes ekg-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

        .ds-pulse svg {
          width: 100%;
          height: 36px;
          overflow: hidden;
        }

        /* ── Countdown ── */
        .ds-countdown {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 48px;
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1;
          margin: 0 0 6px;
          transition: color 0.4s;
        }

        .ds-countdown.normal { color: #e2e8f0; }
        .ds-countdown.urgent {
          color: #dc2626;
          text-shadow: 0 0 20px rgba(220,38,38,0.3);
        }

        .ds-countdown-label {
          font-size: 11px;
          color: #3d5066;
          margin: 0 0 20px;
          line-height: 1.5;
        }

        /* ── Divider ── */
        .ds-divider {
          border: none;
          border-top: 1px solid #1c2333;
          margin: 0 0 18px;
        }

        /* ── Form ── */
        .ds-label {
          display: block;
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #3d5066;
          font-family: 'IBM Plex Mono', monospace;
          margin-bottom: 8px;
        }

        .ds-input {
          width: 100%;
          background: #080b10;
          border: 1px solid #1c2333;
          border-radius: 3px;
          color: #e2e8f0;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 14px;
          padding: 11px 14px;
          outline: none;
          margin-bottom: 12px;
          transition: border-color 0.15s;
          box-sizing: border-box;
        }

        .ds-input:focus {
          border-color: #00d082;
        }

        .ds-input::placeholder { color: #2a3a4d; }

        .ds-btn {
          width: 100%;
          padding: 12px;
          border-radius: 3px;
          border: none;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.06em;
          cursor: pointer;
          background: #00d082;
          color: #07090d;
          transition: opacity 0.15s, filter 0.15s;
          margin-bottom: 4px;
          margin-top: 0;
        }

        .ds-btn:hover:not(:disabled) { filter: brightness(1.1); }
        .ds-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .ds-message {
          font-size: 12px;
          color: #00d082;
          margin: 8px 0 0;
          font-family: 'IBM Plex Mono', monospace;
        }

        /* ── Warning block — redesigned ── */
        .ds-warning {
          margin-top: 20px;
          border-left: 3px solid #dc2626;
          background: #0f0a0a;
          padding: 14px 16px;
          border-radius: 0 3px 3px 0;
          position: relative;
          overflow: hidden;
        }

        /* subtle scanline texture */
        .ds-warning::before {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 3px,
            rgba(220,38,38,0.015) 3px,
            rgba(220,38,38,0.015) 4px
          );
          pointer-events: none;
        }

        .ds-warning-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .ds-warning-dot {
          width: 6px; height: 6px;
          background: #dc2626;
          border-radius: 50%;
          animation: blink 1.2s step-end infinite;
          flex-shrink: 0;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        .ds-warning-title {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.2em;
          color: #dc2626;
          text-transform: uppercase;
        }

        .ds-warning-text {
          font-size: 12px;
          color: #8b9aaa;
          line-height: 1.65;
          margin: 0;
          position: relative;
        }

        .ds-warning-text strong {
          color: #c0cad4;
          font-weight: 600;
        }

        /* ── Destinations ── */
        .ds-dest-wrap {
          margin-top: 18px;
        }

        .ds-dest-label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.18em;
          color: #2a3a4d;
          text-transform: uppercase;
          margin: 0 0 8px;
        }

        .ds-dest-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .ds-badge {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          color: #3d5066;
          border: 1px solid #1c2333;
          border-radius: 2px;
          padding: 3px 8px;
          letter-spacing: 0.04em;
          background: #080b10;
        }

        /* ── Footer link ── */
        .ds-foot {
          display: block;
          text-align: center;
          margin-top: 20px;
          font-size: 11px;
          color: #2a3a4d;
          font-family: 'IBM Plex Mono', monospace;
          text-decoration: none;
          letter-spacing: 0.04em;
          transition: color 0.15s;
        }

        .ds-foot:hover { color: #00d082; }
      `}</style>

      <main className="ds-root">
        <div className={`ds-panel${isUrgent ? " urgent" : ""}`}>

          <p className="ds-eyebrow">// DEADMAN SWITCH v1.0</p>

          <h1 className={`ds-status ${triggered ? "triggered" : "armed"}`}>
            <span className={`ds-dot ${triggered ? "triggered" : "armed"}`} />
            {triggered ? "TRIGGERED — FILE TERKIRIM" : "ARMED — MENUNGGU ABSEN"}
          </h1>

          {/* EKG Line */}
<div className="ds-pulse">
  <svg
    className={triggered ? "" : "ds-pulse-anim"}
    viewBox="0 0 400 36"
    preserveAspectRatio="none"
    style={{ width: "200%", height: "36px", display: "block" }}
  >
    <polyline
      points="0,18 50,18 62,5 68,31 76,18 120,18 128,22 136,18 200,18 212,8 218,28 224,18 260,18 265,14 272,22 278,18 400,18 450,18 462,5 468,31 476,18 520,18 528,22 536,18 600,18 612,8 618,28 624,18 660,18 665,14 672,22 678,18 800,18"
      fill="none"
      stroke={triggered ? "#dc2626" : isUrgent ? "#dc2626" : "#00d082"}
      strokeWidth="1.5"
      opacity="0.7"
    />
  </svg>
</div>

          {/* Countdown */}
          {status && (
            <>
              <div className={`ds-countdown ${isUrgent ? "urgent" : "normal"}`}>
                {triggered ? "--:--:--" : formatRemaining(remaining)}
              </div>
              <p className="ds-countdown-label">
                sisa waktu sebelum switch aktif &nbsp;·&nbsp; absen terakhir{" "}
                {new Date(status.last_checkin).toLocaleString("id-ID")}
              </p>
            </>
          )}

          <hr className="ds-divider" />

          {/* Form absen */}
          <label className="ds-label" htmlFor="pin">PIN</label>
          <input
            id="pin"
            className="ds-input"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="············"
            onKeyDown={(e) => e.key === "Enter" && handleCheckin()}
          />
          <button className="ds-btn" onClick={handleCheckin} disabled={loading || !pin}>
            {loading ? "MEMPROSES..." : "ABSEN SEKARANG"}
          </button>

          {message && <p className="ds-message">› {message}</p>}

          {/* Warning block */}
          <div className="ds-warning">
            <div className="ds-warning-header">
              <span className="ds-warning-dot" />
              <span className="ds-warning-title">Peringatan</span>
            </div>
            <p className="ds-warning-text">
              Jika hitungan mundur mencapai nol tanpa absen, sistem akan mengirim{" "}
              <strong>seluruh berkas yang tersimpan</strong> secara otomatis dan permanen.{" "}
              <strong>Tidak ada peringatan lanjutan. Tidak ada pembatalan</strong> setelah
              proses dimulai.
            </p>
          </div>

          {/* Target destinations */}
          <div className="ds-dest-wrap">
            <p className="ds-dest-label">Target dissemination</p>
            <div className="ds-dest-grid">
              {["Telegram Bot", "Corporate Portal", "X (Twitter)", "TikTok", "Facebook", "Instagram"].map((d) => (
                <span key={d} className="ds-badge">{d}</span>
              ))}
            </div>
          </div>

          <Link href="/admin" className="ds-foot">
            Kelola file & pengaturan →
          </Link>
        </div>
      </main>
    </>
  );
}
