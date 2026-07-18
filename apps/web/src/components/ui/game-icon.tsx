"use client";

import { memo } from "react";

/** Colorful 3D game icons — plain img avoids Next/Image remount flicker on HUD re-renders. */
export const GameIcon = memo(function GameIcon({
  src,
  alt = "",
  size = 40,
  className = "",
}: {
  src: string;
  alt?: string;
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`pointer-events-none select-none object-contain drop-shadow-md ${className}`}
      style={{ width: size, height: size }}
      draggable={false}
      decoding="async"
      loading="eager"
    />
  );
});
