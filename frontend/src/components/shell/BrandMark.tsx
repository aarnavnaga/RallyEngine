"use client";

import { useState } from "react";
import type { Brand } from "@/lib/data/brands";

type FallbackLevel = "primary" | "clearbit" | "google" | "letter";

function domainFromWebsite(website: string): string {
  return website.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function isLocalPath(value: string): boolean {
  return value.startsWith("/");
}

type BrandMarkProps = {
  brand: Brand;
  size?: number;
  /**
   * When true, force eager image loading — use only for above-the-fold
   * brand logos (e.g. the contract preview header). Default is lazy so
   * grids/lists with many BrandMarks don't flood the network.
   *
   * Note: callers that reuse a single BrandMark instance for multiple
   * brands (e.g. a contract preview that swaps brands on row click)
   * should pass `key={brand.id}` to force remount and reset the
   * onError-driven fallback chain. Without that, the level state from
   * the previous brand can leak in and a missing logo only resolves
   * after onError cycles through.
   */
  eager?: boolean;
};

export function BrandMark({ brand, size = 28, eager = false }: BrandMarkProps) {
  const domain = domainFromWebsite(brand.website);
  const clearbitSrc = `https://logo.clearbit.com/${domain}`;
  const googleSrc = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

  // If brand.logo_url is an absolute URL or a local path, use it as the
  // primary source. Otherwise skip straight to the clearbit/google chain
  // built from brand.website.
  const hasExplicitLogo =
    typeof brand.logo_url === "string" &&
    brand.logo_url.length > 0 &&
    (isAbsoluteUrl(brand.logo_url) || isLocalPath(brand.logo_url));

  const initialLevel: FallbackLevel = hasExplicitLogo ? "primary" : "clearbit";
  const [level, setLevel] = useState<FallbackLevel>(initialLevel);

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

  let src: string;
  if (level === "primary" && hasExplicitLogo && brand.logo_url) {
    src = brand.logo_url;
  } else if (level === "clearbit") {
    src = clearbitSrc;
  } else {
    src = googleSrc;
  }

  function handleError() {
    if (level === "primary") {
      setLevel("clearbit");
    } else if (level === "clearbit") {
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
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={eager ? "high" : "auto"}
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
