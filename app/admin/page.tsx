"use client";

import { useState } from "react";
import Link from "next/link";

type FileRow = {
  id: string;
  filename: string;
  mime_type: string;
  caption: string | null;
  created_at: string;
  storage_path: string;
};

const WORKER_URL = process.env.NEXT_PUBLIC_UPLOAD_WORKER_URL || "/api/files";

export default function Admin() {
  const [pin, setPin]               = useState("");
  const [unlocked, setUnlocked]     = useState(false);
  const [files, setFiles]           = useState<FileRow[]>([]);
  const [caption, setCaption]       = useState("");
  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);
  const [message, setMessage]       = useState("");
  const [msgType, setMsgType]       = useState<"ok" | "err">("ok");
  const [busy, setBusy]             = useState(false);
  const [progress, setProgress]     = useState<number | null>(null);

  async function loadFiles(currentPin: string) {
    const res = await fetch("/api/files", { headers: { "x-pin": currentPin } });
    if (res.ok) {
      const data = await res.json();
      setFiles(data.files);
      setUnlocked(true);
    } else {
      setMessage("PIN salah atau tidak valid.");
      setMsgType("err");
    }
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setBusy(true);
    setMessage("");
    setProgress(0);
    const form = new FormData();
    form.append("pin", pin);
    form.append("file", selectedFile);
    form.append("caption", caption);
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", WORKER_URL);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else {
            try { reject(new Error(JSON.parse(xhr.responseText).error || "Gagal.")); }
            catch { reject(new Error("Gagal unggah.")); }
          }
        };
        xhr.onerror = () => reject(new Error("Koneksi gagal."));
        xhr.send(form);
      });
      setMessage("› File berhasil diunggah.");
      setMsgType("ok");
      setSelectedFile(null);
      setCaption("");
      loadFiles(pin);
    } catch (err: any) {
      setMessage("› " + (err.message || "Gagal unggah."));
      setMsgType("err");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function handleDelete(file: FileRow) {
    setBusy(true);
    const res = await fetch("/api/files", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, id: file.id, storage_path: file.storage_path }),
    });
    if (res.ok) loadFiles(pin);
    setBusy(false);
  }

  return (
    <>
      <style>{`
        .adm-root {
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

        .adm-panel {
          width: 100%;
          max-width: 420px;
          background: #0c0f14;
          border: 1px solid #1c2333;
          border-radius: 4px;
          padding: 28px 24px 24px;
          position: relative;
          box-shadow: 0 0 0 1px #0f1520, 0 24px 48px rgba(0,0,0,0.6);
        }

        .adm-panel::before {
          content: '';
          position: absolute;
          top: -1px; left: -1px;
          width: 20px; height: 20px;
          border-top: 2px solid #00d082;
          border-left: 2px solid #00d082;
          border-radius: 3px 0 0 0;
        }

        .adm-panel::after {
          content: '';
          position: absolute;
          bottom: -1px; right: -1px;
          width: 20px; height: 20px;
          border-bottom: 2px solid #1c2333;
          border-right: 2px solid #1c2333;
          border-radius: 0 0 3px 0;
        }

        .adm-eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.18em;
          color: #3d5066;
          text-transform: uppercase;
          margin: 0 0 10px;
        }

        .adm-title {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 15px;
          font-weight: 700;
          color: #e2e8f0;
          margin: 0 0 22px;
          letter-spacing: 0.02em;
        }

        .adm-divider {
          border: none;
          border-top: 1px solid #1c2333;
          margin: 18px 0;
        }

        /* ── Login ── */
        .adm-label {
          display: block;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #3d5066;
          margin-bottom: 8px;
        }

        .adm-input {
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

        .adm-input:focus { border-color: #00d082; }
        .adm-input::placeholder { color: #2a3a4d; }

        .adm-btn {
          width: 100%;
          padding: 12px;
          border-radius: 3px;
          border: none;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          cursor: pointer;
          background: #00d082;
          color: #07090d;
          transition: filter 0.15s;
          margin-top: 0;
        }

        .adm-btn:hover:not(:disabled) { filter: brightness(1.1); }
        .adm-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .adm-btn-ghost {
          width: 100%;
          padding: 11px;
          border-radius: 3px;
          border: 1px solid #1c2333;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.06em;
          cursor: pointer;
          background: transparent;
          color: #3d5066;
          transition: all 0.15s;
          margin-top: 10px;
        }

        .adm-btn-ghost:hover { border-color: #00d082; color: #00d082; }

        .adm-msg {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          margin: 10px 0 0;
        }

        .adm-msg.ok { color: #00d082; }
        .adm-msg.err { color: #dc2626; }

        /* ── File list ── */
        .adm-empty {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: #2a3a4d;
          margin: 0 0 16px;
          padding: 14px;
          border: 1px dashed #1c2333;
          border-radius: 3px;
          text-align: center;
        }

        .adm-file-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 16px;
        }

        .adm-file-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: #080b10;
          border: 1px solid #1c2333;
          border-radius: 3px;
        }

        .adm-file-name {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: #8b9aaa;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }

        .adm-file-name::before {
          content: '› ';
          color: #00d082;
        }

        .adm-remove {
          background: transparent;
          border: 1px solid #2a1a1a;
          color: #dc2626;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          padding: 3px 8px;
          border-radius: 2px;
          cursor: pointer;
          flex-shrink: 0;
          width: auto;
          margin-top: 0;
          transition: all 0.15s;
          letter-spacing: 0.04em;
        }

        .adm-remove:hover:not(:disabled) {
          background: rgba(220,38,38,0.1);
          border-color: #dc2626;
        }

        /* ── Upload section ── */
        .adm-section-label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #3d5066;
          margin: 0 0 10px;
        }

        .adm-file-picker {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          padding: 10px 12px;
          background: #080b10;
          border: 1px dashed #1c2333;
          border-radius: 3px;
          transition: border-color 0.15s;
        }

        .adm-file-picker:hover { border-color: #2a3a4d; }

        .adm-file-picker input[type="file"] { display: none; }

        .adm-pick-btn {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #07090d;
          background: #00d082;
          border: none;
          padding: 5px 10px;
          border-radius: 2px;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          width: auto;
          margin-top: 0;
          transition: filter 0.15s;
        }

        .adm-pick-btn:hover { filter: brightness(1.1); }

        .adm-pick-name {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: #3d5066;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }

        .adm-pick-name.selected { color: #8b9aaa; }

        /* Progress bar */
        .adm-progress-wrap {
          margin-bottom: 12px;
        }

        .adm-progress-track {
          background: #080b10;
          border: 1px solid #1c2333;
          border-radius: 2px;
          height: 4px;
          overflow: hidden;
        }

        .adm-progress-bar {
          height: 100%;
          background: #00d082;
          transition: width 0.2s ease;
          box-shadow: 0 0 6px rgba(0,208,130,0.4);
        }

        .adm-progress-label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          color: #00d082;
          margin: 4px 0 0;
        }

        /* ── Footer ── */
        .adm-foot {
          display: block;
          text-align: center;
          margin-top: 20px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: #2a3a4d;
          text-decoration: none;
          letter-spacing: 0.04em;
          transition: color 0.15s;
        }

        .adm-foot:hover { color: #00d082; }
      `}</style>

      <main className="adm-root">
        <div className="adm-panel">
          <p className="adm-eyebrow">// DEADMAN SWITCH</p>

          {!unlocked ? (
            <>
              <h1 className="adm-title">AKSES PANEL ADMIN</h1>

              <label className="adm-label" htmlFor="pin">Masukkan PIN</label>
              <input
                id="pin"
                className="adm-input"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadFiles(pin)}
                placeholder="············"
              />
              <button className="adm-btn" onClick={() => loadFiles(pin)} disabled={!pin}>
                VERIFIKASI →
              </button>

              {message && <p className={`adm-msg ${msgType}`}>{message}</p>}

              <Link href="/" className="adm-foot">← Kembali ke halaman absen</Link>
            </>
          ) : (
            <>
              <h1 className="adm-title">FILE YANG AKAN DIKIRIM</h1>

              {/* File list */}
              {files.length === 0 ? (
                <div className="adm-empty">— belum ada file terdaftar —</div>
              ) : (
                <div className="adm-file-list">
                  {files.map((f) => (
                    <div className="adm-file-row" key={f.id}>
                      <span className="adm-file-name" title={f.filename}>{f.filename}</span>
                      <button
                        className="adm-remove"
                        onClick={() => handleDelete(f)}
                        disabled={busy}
                      >
                        HAPUS
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <hr className="adm-divider" />

              {/* Upload section */}
              <p className="adm-section-label">Tambah file</p>

              <div className="adm-file-picker">
                <input
                  id="file-input"
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                <label htmlFor="file-input" className="adm-pick-btn">PILIH</label>
                <span className={`adm-pick-name ${selectedFile ? "selected" : ""}`}>
                  {selectedFile ? selectedFile.name : "tidak ada file dipilih"}
                </span>
              </div>

              <label className="adm-label" htmlFor="caption">Caption (opsional)</label>
              <input
                id="caption"
                className="adm-input"
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Pesan singkat untuk file ini"
              />

              {progress !== null && (
                <div className="adm-progress-wrap">
                  <div className="adm-progress-track">
                    <div className="adm-progress-bar" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="adm-progress-label">{progress}% terunggah...</p>
                </div>
              )}

              <button
                className="adm-btn"
                onClick={handleUpload}
                disabled={busy || !selectedFile}
              >
                {busy ? "MENGUNGGAH..." : "UNGGAH FILE →"}
              </button>

              {message && <p className={`adm-msg ${msgType}`}>{message}</p>}

              <Link href="/" className="adm-foot">← Kembali ke halaman absen</Link>
            </>
          )}
        </div>
      </main>
    </>
  );
}
