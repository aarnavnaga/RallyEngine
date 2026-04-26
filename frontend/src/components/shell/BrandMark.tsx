"use client";

import { useState } from "react";
import type { Brand } from "@/lib/data/brands";

type FallbackLevel = "clearbit" | "google" | "letter";

function domainFromWebsite(website: string): string {
  return website.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

export function BrandMark({ brand, size = 28 }: { brand: Brand; size?: number }) {
  const domain = domainFromWebsite(brand.logo_url ?? brand.website);
  const clearbitSrc = `https://logo.clearbit.com/${domain}`;
  const googleSrc = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

  const [level, setLevel] = useState<FallbackLevel>("clearbit");

  if (level === "letter") {
    const initial = brand.name.replace(/[^A-Za-z]/g, "").slice(0, 1).toUpperCase();
    return (
      <span
        className="inline-grid place-items-center rounded-md font-semibold text-white"
        style={{
          width: size,
          height: size,
          background: brand.color,
          fontSize: Math.max(12, size * 0.5),
        }}
        aria-label={brand.name}
      >
        {initial}
      </span>
    );
  }

  const src = level === "clearbit" ? clearbitSrc : googleSrc;

  function handleError() {
    if (level === "clearbit") {
      setLevel("google");
    } else {
      setLevel("letter");
    }
  }

  return (
    <span
      className="inline-grid place-items-center rounded-md overflow-hidden"
      style={{
        width: size,
        height: size,
        background: "#ffffff",
        border: "1px solid var(--border)",
        padding: 2,
      }}
      aria-label={brand.name}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={brand.name}
        loading="lazy"
        onError={handleError}
        style={{
          width: size - 4,
          height: size - 4,
          objectFit: "contain",
          borderRadius: 4,
        }}
      />
    </span>
  );
}
