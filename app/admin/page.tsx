"use client";

import { useState } from "react";
import Link from "next/link";

type FileRow = {
  id: string;
  filename: string;
  mime_type: string;
  caption: string | null;
  created_at: string;
};

export default function Admin() {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

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
    const form = new FormData();
    form.append("pin", pin);
    form.append("file", selectedFile);
    form.append("caption", caption);

    const res = await fetch("/api/files", { method: "POST", body: form });
    if (res.ok) {
      setMessage("File terunggah.");
      setSelectedFile(null);
      setCaption("");
      loadFiles(pin);
    } else {
      const data = await res.json();
      setMessage(data.error || "Gagal unggah.");
    }
    setBusy(false);
  }

  async function handleDelete(file: FileRow) {
    setBusy(true);
    const res = await fetch("/api/files", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, id: file.id, storage_path: (file as any).storage_path }),
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
          <label className="field-label" htmlFor="pin">
            PIN
          </label>
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
          <Link href="/" className="foot-link">
            ← Kembali
          </Link>
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
              <span className="file-name" title={f.filename}>
                {f.filename}
              </span>
              <button
                className="remove-btn"
                onClick={() => handleDelete(f)}
                disabled={busy}
              >
                Hapus
              </button>
            </div>
          ))}
        </div>

        <hr className="divider" />

        <label className="field-label">Tambah file (PDF, DOC, dll)</label>
        
        {/* Custom Input File Picker */}
        <div className="custom-file-picker">
          <input
            id="file"
            type="file"
            className="file-input-hidden"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
          <label htmlFor="file" className="file-picker-btn">
            Pilih File
          </label>
          <span className="file-picker-name">
            {selectedFile ? selectedFile.name : "Tidak ada file dipіль"}
          </span>
        </div>

        <label className="field-label" htmlFor="caption">
          Caption (opsional)
        </label>
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

        {message && <p className="message">{message}</p>}

        <Link href="/" className="foot-link">
          ← Kembali ke halaman absen
        </Link>
      </div>
    </main>
  );
}
