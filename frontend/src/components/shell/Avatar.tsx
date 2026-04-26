"use client";

import { useState } from "react";
import clsx from "clsx";
import { getAvatarUrlByName, getCreatorAvatarUrl } from "@/lib/data/creator-avatars";

type Props = {
  name: string;
  // Creator id (handle without @). When provided, looks up TikTok avatar directly.
  // When omitted, auto-resolves by matching name against the creator list.
  id?: string;
  src?: string;
  size?: number;
  color?: string;
  className?: string;
};

export function Avatar({ name, id, src, size = 32, color, className }: Props) {
  // Resolve the TikTok avatar URL: explicit src > id lookup > name-based auto-resolution
  const resolvedTikTokUrl = src ?? (id ? getCreatorAvatarUrl(id) : getAvatarUrlByName(name)) ?? null;

  const [imgFailed, setImgFailed] = useState(false);

  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const seed = hashStr(name);
  const palette = ["#7857ff", "#16a34a", "#f59e0b", "#ec4899", "#0ea5e9", "#8b5cf6", "#ef4444", "#06b6d4"];
  const bg = color ?? palette[seed % palette.length];

  if (resolvedTikTokUrl && !imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedTikTokUrl}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        className={clsx("rounded-full object-cover", className)}
        style={{ width: size, height: size }}
        onError={() => setImgFailed(true)}
      />
    );
  }
  return (
    <span
      className={clsx("inline-grid place-items-center rounded-full font-semibold text-white", className)}
      style={{ width: size, height: size, background: bg, fontSize: Math.max(11, size * 0.42) }}
    >
      {initials || "?"}
    </span>
  );
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
