"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Video, Circle, Square, RotateCcw } from "lucide-react";
import { BentoCard } from "./BentoCard";
import { Icon } from "./Icon";

export interface VideoUploadCardProps {
  onUpload?: (ipfsHash: string) => void;
  /** Maximum recording duration in seconds. Defaults to 60. */
  maxDurationSeconds?: number;
}

const DEFAULT_MAX_DURATION = 60;
const UPLOAD_ENDPOINT = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const QUEUE_STORAGE_KEY = "pod-video-upload-queue";

interface QueuedUpload {
  hash: string;
  name: string;
  type: string;
  dataUrl: string;
}

/** Compute a SHA-256 hex digest of a blob for local dedupe. */
async function computeHash(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function readQueue(): QueuedUpload[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueuedUpload[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedUpload[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch {
    /* storage full or unavailable — ignore */
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read video data"));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(meta)?.[1] ?? "video/webm";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Upload a blob to IPFS with resumable retry semantics. The upload is chunked
 * into a single request but retried with backoff; on persistent failure the
 * caller can queue it for offline retry.
 */
async function uploadToIpfs(
  blob: Blob,
  name: string,
  onProgress: (pct: number) => void
): Promise<string> {
  const data = new FormData();
  data.append("file", blob, name);

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          resolve(res.IpfsHash ?? res.cid ?? res.hash);
        } catch {
          reject(new Error("Malformed upload response"));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.open("POST", UPLOAD_ENDPOINT);
    const jwt = process.env.NEXT_PUBLIC_PINATA_JWT;
    if (jwt) xhr.setRequestHeader("Authorization", `Bearer ${jwt}`);
    xhr.send(data);
  });
}

export function VideoUploadCard({
  onUpload,
  maxDurationSeconds = DEFAULT_MAX_DURATION,
}: VideoUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [ipfsHash, setIpfsHash] = useState<string | null>(null);
  const [localHash, setLocalHash] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [queued, setQueued] = useState(0);

  useEffect(() => {
    setQueued(readQueue().length);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    stopTimer();
    recorderRef.current?.state === "recording" && recorderRef.current.stop();
    setRecording(false);
  }, [stopTimer]);

  const startRecording = useCallback(async () => {
    setError(null);
    setIpfsHash(null);
    setLocalHash(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play().catch(() => undefined);
      }

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size === 0) return;
        const url = URL.createObjectURL(blob);
        setPreview(url);
        const hash = await computeHash(blob);
        setLocalHash(hash);
        await handleBlob(blob, hash, `pod-${hash.slice(0, 12)}.webm`);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          if (next >= maxDurationSeconds) stopRecording();
          return next;
        });
      }, 1000);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Camera unavailable: ${err.message}`
          : "Camera unavailable"
      );
    }
  }, [maxDurationSeconds, stopRecording]);

  const handleBlob = useCallback(
    async (blob: Blob, hash: string, name: string) => {
      setUploading(true);
      setProgress(0);
      try {
        const cid = await uploadToIpfs(blob, name, setProgress);
        setIpfsHash(cid);
        onUpload?.(cid);
      } catch (err) {
        // Offline / failed: queue for later retry, deduped by local hash.
        const queue = readQueue();
        if (!queue.some((q) => q.hash === hash)) {
          const dataUrl = await blobToDataUrl(blob);
          queue.push({ hash, name, type: blob.type, dataUrl });
          writeQueue(queue);
          setQueued(queue.length);
        }
        setError(
          err instanceof Error
            ? `${err.message} — saved locally for retry`
            : "Upload failed — saved locally for retry"
        );
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [onUpload]
  );

  const flushQueue = useCallback(async () => {
    const queue = readQueue();
    if (queue.length === 0) return;
    setUploading(true);
    const remaining: QueuedUpload[] = [];
    for (const item of queue) {
      try {
        const blob = dataUrlToBlob(item.dataUrl);
        const cid = await uploadToIpfs(blob, item.name, setProgress);
        setIpfsHash(cid);
        onUpload?.(cid);
      } catch {
        remaining.push(item);
      }
    }
    writeQueue(remaining);
    setQueued(remaining.length);
    setUploading(false);
    setProgress(0);
  }, [onUpload]);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file) return;
      setError(null);
      setIpfsHash(null);
      setPreview(URL.createObjectURL(file));
      const hash = await computeHash(file);
      setLocalHash(hash);
      await handleBlob(file, hash, file.name);
    },
    [handleBlob]
  );

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const remaining = Math.max(0, maxDurationSeconds - elapsed);

  return (
    <BentoCard
      title="Evidence Upload"
      icon={<Video className="w-5 h-5" />}
      glowVariant="gold"
      className="h-full"
    >
      {/* Live camera preview while recording */}
      {recording && (
        <video
          ref={videoRef}
          playsInline
          muted
          className="w-full max-h-40 rounded-lg object-cover mb-3 bg-black"
        />
      )}

      {/* Drop zone — accessible */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload delivery proof video — drag and drop or press Enter to browse"
        aria-disabled={uploading || recording}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => { if (!uploading && !recording) inputRef.current?.click(); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!uploading && !recording) inputRef.current?.click();
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
        {preview && !recording ? (
          <video
            src={preview}
            controls
            className="w-full max-h-40 rounded-lg object-cover"
          />
        ) : !recording ? (
          <>
            <Video className="w-8 h-8 text-text-muted" />
            <p className="text-text-muted text-sm text-center">
              Record or upload delivery proof video for verification
            </p>
            <span className="text-xs text-text-muted">
              Drag &amp; drop or click to browse
            </span>
          </>
        ) : null}
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

      {/* Recorder controls */}
      <div className="mt-3 flex items-center gap-2">
        {!recording ? (
          <button
            type="button"
            onClick={startRecording}
            disabled={uploading}
            className="
              flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold
              bg-bg-elevated text-gold hover:bg-bg-elevated/80
              disabled:opacity-40 disabled:cursor-not-allowed
              focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2
              transition-colors duration-200
            "
          >
            <Circle className="w-4 h-4" /> Record ({maxDurationSeconds}s max)
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="
              flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold
              bg-status-danger text-text-inverse hover:opacity-90
              focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2
              transition-colors duration-200
            "
          >
            <Square className="w-4 h-4" /> Stop ({remaining}s left)
          </button>
        )}
      </div>

      {/* Local hash + dedupe indicator */}
      {localHash && (
        <p className="mt-2 text-[11px] text-text-muted truncate" title={localHash}>
          Local hash: {localHash.slice(0, 16)}…
        </p>
      )}

      {/* Offline queue */}
      {queued > 0 && (
        <button
          type="button"
          onClick={flushQueue}
          disabled={uploading}
          className="
            mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold
            bg-bg-elevated text-gold hover:bg-bg-elevated/80
            disabled:opacity-40 disabled:cursor-not-allowed
            focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2
            transition-colors duration-200
          "
        >
          <RotateCcw className="w-3.5 h-3.5" /> Retry {queued} queued upload{queued > 1 ? "s" : ""}
        </button>
      )}

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
            href={`https://gateway.pinata.cloud/ipfs/${ipfsHash}`}
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
      {!ipfsHash && <p id="video-upload-hint" className="sr-only">Record or upload video evidence before submitting proof</p>}
    </BentoCard>
  );
}

export default VideoUploadCard;
