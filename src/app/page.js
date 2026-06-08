"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function isImage(name) {
  return /\.(jpg|jpeg|png|gif|webp|svg|avif)$/i.test(name);
}

export default function Home() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [captions, setCaptions] = useState({});
  const [loadingCaption, setLoadingCaption] = useState({});
  const [copied, setCopied] = useState("");
  const fileInputRef = useRef(null);

  const fetchFiles = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const res = await fetch("/api/files");
      const data = await res.json();
      if (data.files) setFiles(data.files);
    } catch {
      // silently fail
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setError("");
    setUploadResult(null);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setUploadResult(data);
      await fetchFiles();
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const copyToClipboard = (url, key) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(""), 2000);
    });
  };

  const generateCaption = async (file) => {
    setLoadingCaption((prev) => ({ ...prev, [file.name]: true }));
    try {
      const res = await fetch("/api/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: file.publicUrl, fileName: file.name }),
      });
      const data = await res.json();
      if (data.caption) {
        setCaptions((prev) => ({ ...prev, [file.name]: data.caption }));
      }
    } catch {
      setCaptions((prev) => ({ ...prev, [file.name]: "Could not generate caption." }));
    } finally {
      setLoadingCaption((prev) => ({ ...prev, [file.name]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white font-sans">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-lg">⚡</div>
          <h1 className="text-xl font-bold tracking-tight">QuickShare Hub</h1>
          <span className="ml-auto text-xs text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
            Powered by Supabase + Gemini AI
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">

        {/* Upload Zone */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-indigo-400 mb-4">Upload a File</h2>
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative cursor-pointer border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200
              ${dragging ? "border-indigo-400 bg-indigo-500/10 scale-[1.01]" : "border-white/20 hover:border-indigo-500/60 hover:bg-white/5"}
              ${uploading ? "opacity-60 pointer-events-none" : ""}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
            <div className="text-5xl mb-4">{uploading ? "⏳" : "📁"}</div>
            <p className="text-lg font-medium text-white/80">
              {uploading ? "Uploading..." : "Drop file here or click to browse"}
            </p>
            <p className="text-sm text-slate-500 mt-1">Any file type • Max size depends on your Supabase plan</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 p-4 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-sm">
              ❌ {error}
            </div>
          )}

          {/* Upload Success */}
          {uploadResult && (
            <div className="mt-4 p-5 bg-green-500/10 border border-green-500/30 rounded-xl space-y-3">
              <p className="text-green-400 font-semibold">✅ Uploaded successfully!</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={uploadResult.publicUrl}
                  className="flex-1 bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-slate-300 truncate"
                />
                <button
                  onClick={() => copyToClipboard(uploadResult.publicUrl, "upload")}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-sm rounded-lg font-medium transition-colors whitespace-nowrap"
                >
                  {copied === "upload" ? "Copied!" : "Copy Link"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Recent Uploads */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-indigo-400">Recent Uploads</h2>
            <button
              onClick={fetchFiles}
              disabled={loadingFiles}
              className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20"
            >
              {loadingFiles ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>

          {loadingFiles ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <div className="text-4xl mb-3">🗂️</div>
              <p>No uploads yet. Upload your first file above!</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {files.map((file) => (
                <li
                  key={file.name}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start gap-4 hover:bg-white/8 transition-colors"
                >
                  {/* Thumbnail */}
                  {isImage(file.name) && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                      <img
                        src={file.publicUrl}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate text-white/90">{file.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatBytes(file.size)}</p>

                    {/* Caption */}
                    {captions[file.name] && (
                      <p className="mt-2 text-xs text-indigo-300 italic bg-indigo-900/20 px-3 py-2 rounded-lg border border-indigo-700/30">
                        ✨ {captions[file.name]}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => copyToClipboard(file.publicUrl, file.name)}
                        className="text-xs px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-500 rounded-lg font-medium transition-colors"
                      >
                        {copied === file.name ? "Copied!" : "Copy Link"}
                      </button>
                      <a
                        href={file.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors"
                      >
                        Open ↗
                      </a>
                      {isImage(file.name) && (
                        <button
                          onClick={() => generateCaption(file)}
                          disabled={loadingCaption[file.name]}
                          className="text-xs px-3 py-1.5 bg-violet-700/70 hover:bg-violet-600 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                          {loadingCaption[file.name] ? "Generating..." : "✨ AI Caption"}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="text-center text-xs text-slate-600 py-8">
        QuickShare Hub · Built with Next.js, Supabase & Gemini AI
      </footer>
    </div>
  );
}
