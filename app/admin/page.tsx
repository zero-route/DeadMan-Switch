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

// URL Worker Cloudflare — isi setelah deploy Worker
const WORKER_URL = process.env.NEXT_PUBLIC_UPLOAD_WORKER_URL || "/api/files";

export default function Admin() {
  const [pin, setPin]               = useState("");
  const [unlocked, setUnlocked]     = useState(false);
  const [files, setFiles]           = useState<FileRow[]>([]);
  const [caption, setCaption]       = useState("");
  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);
  const [message, setMessage]       = useState("");
  const [busy, setBusy]             = useState(false);
  const [progress, setProgress]     = useState<number | null>(null);

  async function loadFiles(currentPin: string) {
    const res = await fetch("/api/files", { headers: { "x-pin": currentPin } });
    if (res.ok) {
      const data = await res.json();
      setFiles(data.files);
      setUnlocked(true);
    } else {
      setMessage("PIN salah.");
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
      // Pakai XMLHttpRequest agar bisa track progress upload
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", WORKER_URL);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            try {
              const data = JSON.parse(xhr.responseText);
              reject(new Error(data.error || "Gagal unggah."));
            } catch {
              reject(new Error("Gagal unggah."));
            }
          }
        };

        xhr.onerror = () => reject(new Error("Koneksi gagal."));
        xhr.send(form);
      });

      setMessage("File terunggah.");
      setSelectedFile(null);
      setCaption("");
      loadFiles(pin);
    } catch (err: any) {
      setMessage(err.message || "Gagal unggah.");
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

  if (!unlocked) {
    return (
      <main className="screen">
        <div className="panel">
          <p className="eyebrow">Deadman Switch</p>
          <h1>Kelola File</h1>
          <label className="field-label" htmlFor="pin">PIN</label>
          <input
            id="pin"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadFiles(pin)}
            placeholder="Masukkan PIN Admin"
          />
          <button onClick={() => loadFiles(pin)}>Masuk</button>
          {message && <p className="message">{message}</p>}
          <Link href="/" className="foot-link">← Kembali</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="screen">
      <div className="panel">
        <p className="eyebrow">Deadman Switch</p>
        <h1>File yang akan dikirim</h1>

        {files.length === 0 && <p className="message">Belum ada file terdaftar.</p>}

        <div className="file-list">
          {files.map((f) => (
            <div className="file-row" key={f.id}>
              <span className="file-name" title={f.filename}>{f.filename}</span>
              <button className="remove-btn" onClick={() => handleDelete(f)} disabled={busy}>
                Hapus
              </button>
            </div>
          ))}
        </div>

        <hr className="divider" />

        <label className="field-label">Tambah file (PDF, DOC, dll)</label>

        <div className="custom-file-picker">
          <input
            id="file"
            type="file"
            className="file-input-hidden"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
          <label htmlFor="file" className="file-picker-btn">Pilih File</label>
          <span className="file-picker-name">
            {selectedFile ? selectedFile.name : "Tidak ada file dipilih"}
          </span>
        </div>

        <label className="field-label" htmlFor="caption">Caption (opsional)</label>
        <input
          id="caption"
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Pesan singkat untuk file ini"
        />

        <button onClick={handleUpload} disabled={busy || !selectedFile}>
          {busy ? "Mengunggah..." : "Unggah"}
        </button>

        {/* Progress bar */}
        {progress !== null && (
          <div style={{ marginTop: 12 }}>
            <div style={{
              background: "#1c1c2e",
              borderRadius: 6,
              height: 8,
              overflow: "hidden",
            }}>
              <div style={{
                width: `${progress}%`,
                height: "100%",
                background: "#4cd787",
                transition: "width 0.2s ease",
              }} />
            </div>
            <p style={{ fontSize: 12, color: "#9b93bf", marginTop: 4 }}>
              {progress}% terunggah
            </p>
          </div>
        )}

        {message && <p className="message">{message}</p>}

        <Link href="/" className="foot-link">← Kembali ke halaman absen</Link>
      </div>
    </main>
  );
}
