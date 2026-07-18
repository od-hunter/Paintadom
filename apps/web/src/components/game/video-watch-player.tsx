"use client";

import { useEffect, useRef, useState } from "react";
import { getAdVideo } from "@/data/challenges";
import { GameIcon } from "@/components/ui/game-icon";
import { CenteredModal } from "@/components/ui/centered-modal";
import { playSfx } from "@/lib/audio";
import { useGameStore } from "@/store/game-store";

export function VideoWatchPlayer({
  open,
  videoIndex,
  onClose,
  onCompleted,
}: {
  open: boolean;
  videoIndex: number;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const video = getAdVideo(videoIndex);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const ref = useRef<HTMLVideoElement>(null);
  const [watched, setWatched] = useState(0);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const maxSeen = useRef(0);

  useEffect(() => {
    if (!open) return;
    setWatched(0);
    setReady(false);
    setPlaying(false);
    setError(null);
    maxSeen.current = 0;
  }, [open, videoIndex]);

  useEffect(() => {
    if (!open) return;
    const el = ref.current;
    if (!el) return;

    const onTime = () => {
      // Block skipping ahead
      if (el.currentTime > maxSeen.current + 0.75) {
        el.currentTime = maxSeen.current;
        return;
      }
      maxSeen.current = Math.max(maxSeen.current, el.currentTime);
      setWatched(maxSeen.current);
      if (maxSeen.current >= video.durationSec - 0.25) {
        setReady(true);
      }
    };

    const onEnded = () => {
      maxSeen.current = Math.max(maxSeen.current, video.durationSec);
      setWatched(video.durationSec);
      setReady(true);
      setPlaying(false);
    };

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onErr = () =>
      setError("Video failed to load. Check your connection and try again.");

    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnded);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("error", onErr);

    // Auto-start
    void el.play().catch(() => {
      setError("Tap play to start the video.");
    });

    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("error", onErr);
      el.pause();
    };
  }, [open, videoIndex, video.durationSec]);

  const pct = Math.min(100, (watched / video.durationSec) * 100);
  const left = Math.max(0, Math.ceil(video.durationSec - watched));

  return (
    <CenteredModal open={open} onClose={onClose} zIndex={100}>
      <div className="flex w-full flex-col overflow-hidden rounded-[1.5rem] border-4 border-white bg-slate-950 shadow-[0_12px_0_rgba(0,0,0,0.4)]">
        <div className="relative flex items-center justify-between bg-slate-900 px-3 py-2">
          <p className="font-display text-sm font-black text-white">
            Video {videoIndex + 1} · {video.durationSec}s
          </p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-lg font-black text-white"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="relative aspect-video w-full bg-black">
          <video
            ref={ref}
            key={`${videoIndex}-${video.src}`}
            src={video.src}
            className="h-full w-full object-contain"
            playsInline
            controls={false}
            preload="auto"
            onContextMenu={(e) => e.preventDefault()}
          />
          {!playing && !ready && (
            <button
              type="button"
              onClick={() => {
                void ref.current?.play();
                setError(null);
              }}
              className="absolute inset-0 flex items-center justify-center bg-black/40"
              aria-label="Play video"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/play.svg"
                alt=""
                className="h-16 w-16 drop-shadow-lg"
              />
            </button>
          )}
        </div>

        <div className="space-y-2 px-3 py-3">
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500 transition-[width]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-center text-xs font-bold text-slate-300">
            {ready
              ? "Finished — claim your reward"
              : `Watch ${left}s more to earn +${video.sparks} Sparks`}
          </p>
          {video.unlocksDiscount && (
            <p className="text-center text-[11px] font-black text-lime-300">
              Completing this unlocks an art discount!
            </p>
          )}
          {error && (
            <p className="text-center text-xs font-bold text-amber-300">
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={!ready}
            onClick={() => {
              playSfx("claim", soundEnabled);
              onCompleted();
            }}
            className="btn-lime flex w-full items-center justify-center gap-1 disabled:opacity-40"
          >
            <GameIcon src="/icons/sparks.webp" size={20} />
            Claim +{video.sparks} Sparks
          </button>
        </div>
      </div>
    </CenteredModal>
  );
}
