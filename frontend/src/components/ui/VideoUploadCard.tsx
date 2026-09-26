"use client";

import React, { useRef, useState } from "react";
import { Video } from "lucide-react";
import { BentoCard } from "./BentoCard";
import { Icon } from "./Icon";

export interface VideoUploadCardProps {
  onUpload?: (ipfsHash: string) => void;
}

/**
 * Server-side proxy route that pins files to IPFS.
 * The Pinata secret (PINATA_SECRET / PINATA_JWT) is only read on the server,
 * never inlined into the client bundle.
 */
const PINATA_UPLOAD_ENDPOINT = "/api/pinata/upload";

/**
 * Public IPFS gateway used to render the uploaded asset.
 * Safe to expose, so it is read from a NEXT_PUBLIC_* var (inlined by Next.js).
 */
const IPFS_GATEWAY =
  process.env.NEXT_PUBLIC_PINATA_GATEWAY ?? "https://gateway.pinata.cloud";

export function VideoUploadCard({ onUpload }: VideoUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [ipfsHash, setIpfsHash] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setError(null);
    setUploading(true);
    setProgress(0);

    try {
      const data = new FormData();
      data.append("file", file);

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      const hash = await new Promise<string>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const res = JSON.parse(xhr.responseText);
            resolve(res.IpfsHash ?? res.cid ?? res.hash);
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        // Upload through the server-side proxy so the Pinata secret
        // (PINATA_SECRET / PINATA_JWT) never reaches the browser.
        xhr.open("POST", PINATA_UPLOAD_ENDPOINT);
        xhr.send(data);
      });

      setIpfsHash(hash);
      onUpload?.(hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <BentoCard
      title="Evidence Upload"
      icon={<Video className="w-5 h-5" />}
      glowVariant="gold"
      className="h-full"
    >
      {/* Drop zone — accessible */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload delivery proof video — drag and drop or press Enter to browse"
        aria-disabled={uploading}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => { if (!uploading) inputRef.current?.click(); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!uploading) inputRef.current?.click();
          }
        }}
        className="
          border-2 border-dashed border-border-default
          rounded-xl p-6 flex flex-col items-center justify-center gap-3
          cursor-pointer
          hover:border-border-hover hover:bg-bg-elevated
          focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2
          transition-colors duration-200
          min-h-[140px]
        "
      >
        {preview ? (
          <video
            src={preview}
            controls
            className="w-full max-h-40 rounded-lg object-cover"
          />
        ) : (
          <>
            <Video className="w-8 h-8 text-text-muted" />
            <p className="text-text-muted text-sm text-center">
              Upload delivery proof video for verification
            </p>
            <span className="text-xs text-text-muted">
              Drag &amp; drop or click to browse
            </span>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm"
        aria-label="Choose proof video file"
        aria-hidden={false}
        tabIndex={-1}
        className="hidden file:rounded-full file:bg-elevated file:text-gold"
        onChange={handleChange}
      />

      {/* Upload progress */}
      {uploading && (
        <div className="mt-4 space-y-1">
          <div className="flex justify-between text-xs text-text-muted">
            <span>Uploading to IPFS…</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-bg-elevated rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-gold rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error — announced to AT */}
      {error && (
        <p role="alert" aria-live="polite" className="mt-3 text-xs text-status-danger">{error}</p>
      )}

      {/* IPFS hash link */}
      {ipfsHash && !uploading && (
        <div className="mt-4 flex items-center gap-2 bg-bg-elevated rounded-lg px-3 py-2">
          <span className="text-xs text-text-muted truncate flex-1">
            {ipfsHash}
          </span>
          <a
            href={`${IPFS_GATEWAY}/ipfs/${ipfsHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-gold hover:text-gold-hover transition-colors"
            aria-label="View on IPFS"
          >
            <Icon name="external-link" size="sm" className="text-gold" />
          </a>
        </div>
      )}

      {/* Submit button — disabled state communicated via aria */}
      <button
        disabled={!ipfsHash || uploading}
        aria-disabled={!ipfsHash || uploading}
        aria-describedby={!ipfsHash ? "video-upload-hint" : undefined}
        className="
          mt-4 w-full py-2 rounded-xl text-sm font-semibold
          bg-gold text-text-inverse
          hover:bg-gold-hover
          disabled:opacity-40 disabled:cursor-not-allowed
          focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2
          transition-colors duration-200
        "
      >
        Submit Proof
      </button>
      {!ipfsHash && <p id="video-upload-hint" className="sr-only">Upload video evidence before submitting proof</p>}
    </BentoCard>
  );
}

export default VideoUploadCard;
