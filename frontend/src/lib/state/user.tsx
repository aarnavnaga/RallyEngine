"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Persona = "creator" | "admin";

export type CreatorIdentity = {
  persona: "creator";
  id: "loganmann32";
  name: "Logan Mann";
  handle: "loganmann32";
  email: "loganmann@ucsb.edu";
  avatar: "/aaron.jpg" | "/logan.jpg" | string;
  school: "UC Santa Barbara";
  followers: 22700;
  niche: "Fitness / Gym / UCSB lifestyle";
  badges: ("verified.edu" | "tiktok.connected" | "ig.connected")[];
};

export type AdminIdentity = {
  persona: "admin";
  id: "aaron-langerman";
  name: "Aaron Langerman";
  email: "aaron@mercor.com";
  avatar: "/aaron.jpg" | string;
  title: "Strategic Operations Lead, Mercor";
  team: "Strategic Ops";
};

export type Identity = CreatorIdentity | AdminIdentity;

const LOGAN: CreatorIdentity = {
  persona: "creator",
  id: "loganmann32",
  name: "Logan Mann",
  handle: "loganmann32",
  email: "loganmann@ucsb.edu",
  avatar: "/logan.jpg",
  school: "UC Santa Barbara",
  followers: 22700,
  niche: "Fitness / Gym / UCSB lifestyle",
  badges: ["verified.edu", "tiktok.connected", "ig.connected"],
};

const AARON: AdminIdentity = {
  persona: "admin",
  id: "aaron-langerman",
  name: "Aaron Langerman",
  email: "aaron@mercor.com",
  avatar: "/aaron.jpg",
  title: "Strategic Operations Lead, Mercor",
  team: "Strategic Ops",
};

type Ctx = {
  identity: Identity | null;
  /**
   * False during SSR + the very first client render before localStorage has
   * been read. Routes that gate on `identity` should wait for `hydrated`
   * before redirecting — otherwise a hard refresh sees identity === null,
   * bounces back to the landing page, and only then re-routes to /explore.
   */
  hydrated: boolean;
  signInAs: (persona: Persona) => void;
  signOut: () => void;
  switchPersona: () => void;
  isCreator: boolean;
  isAdmin: boolean;
};

const UserContext = createContext<Ctx | undefined>(undefined);

const STORAGE_KEY = "mercor.identity.v1";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as { persona: Persona };
        if (parsed?.persona === "creator") setIdentity(LOGAN);
        else if (parsed?.persona === "admin") setIdentity(AARON);
        else if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  const persist = useCallback((next: Identity | null) => {
    setIdentity(next);
    try {
      if (typeof window === "undefined") return;
      if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ persona: next.persona }));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  }, []);

  const signInAs = useCallback(
    (persona: Persona) => persist(persona === "creator" ? LOGAN : AARON),
    [persist],
  );

  const signOut = useCallback(() => persist(null), [persist]);

  const switchPersona = useCallback(() => {
    if (!identity) return persist(LOGAN);
    persist(identity.persona === "creator" ? AARON : LOGAN);
  }, [identity, persist]);

  const value = useMemo<Ctx>(
    () => ({
      identity,
      hydrated,
      signInAs,
      signOut,
      switchPersona,
      isCreator: identity?.persona === "creator",
      isAdmin: identity?.persona === "admin",
    }),
    [identity, hydrated, signInAs, signOut, switchPersona],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): Ctx {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
  return ctx;
}

export const PERSONAS = { LOGAN, AARON };
