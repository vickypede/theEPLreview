"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEnsureProfile } from "@/lib/useEnsureProfile";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Club } from "@/types";

const nav = [
  { href: "/", label: "Home" },
  { href: "/clubs", label: "Clubs" },
  { href: "/news", label: "News" },
  { href: "/table", label: "Table" },
  { href: "/profile", label: "log in" },
];

export default function Header() {
  const pathname = usePathname();

  // Auto-create profile on first login
  useEnsureProfile();

  const [open, setOpen] = useState(false);
  const [clubsOpen, setClubsOpen] = useState(false);
  const [clubs, setClubs] = useState<Club[]>([]);

  // Refs for hover/close behavior
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<number | null>(null);
  const [bridgeRect, setBridgeRect] = useState<{ left: number; width: number } | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    // small hover-intent delay so tiny gaps don't cause flicker
    closeTimer.current = window.setTimeout(() => setClubsOpen(false), 220);
  };

  // Close menus on route change
  useEffect(() => {
    setOpen(false);
    setClubsOpen(false);
    cancelClose();
  }, [pathname]);

  // Load clubs
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!db) return;
        const snap = await getDocs(collection(db, "clubs"));
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Club, "id">) })) as Club[];
        list.sort((a, b) => a.name.localeCompare(b.name));
        if (mounted) setClubs(list.slice(0, 20));
      } catch {
        /* noop */
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Centered panel uses fixed positioning; compute a tiny invisible "bridge"
  // from the Clubs button to the panel so there's no hover gap.
  useEffect(() => {
    function updateBridge() {
      const el = btnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const width = Math.max(56, r.width * 0.7);
      const left = r.left + r.width / 2 - width / 2;
      setBridgeRect({ left, width });
    }
    if (clubsOpen) {
      updateBridge();
      window.addEventListener("resize", updateBridge);
      window.addEventListener("scroll", updateBridge, true);
      return () => {
        window.removeEventListener("resize", updateBridge);
        window.removeEventListener("scroll", updateBridge, true);
      };
    }
  }, [clubsOpen]);

  // Close on outside click / scroll / Escape
  useEffect(() => {
    if (!clubsOpen) return;

    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setClubsOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setClubsOpen(false);
    }
    function onScroll() {
      // if user scrolls the page while open, close it
      setClubsOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onScroll, { passive: true });

    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onScroll);
    };
  }, [clubsOpen]);

  return (
    <header className="sticky top-0 z-50 surface border-b border-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative">
        <Link href="/" className="text-xl font-bold tracking-tight text-foreground">
          The EPL Review
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

            if (item.href === "/clubs") {
              return (
                <div
                  key={item.href}
                  className="relative"
                  onMouseEnter={() => {
                    cancelClose();
                    setClubsOpen(true);
                  }}
                  onMouseLeave={scheduleClose}
                  onFocus={() => {
                    cancelClose();
                    setClubsOpen(true);
                  }}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setClubsOpen(false);
                  }}
                >
                  <button
                    type="button"
                    ref={btnRef}
                    className={`inline-flex items-center text-sm font-medium ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    aria-haspopup="menu"
                    aria-expanded={clubsOpen ? "true" : "false"}
                    onClick={() => setClubsOpen((v) => !v)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {item.label}
                      <svg
                        className={`w-4 h-4 transition-transform ${clubsOpen ? "rotate-180" : ""}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </button>

                  {/* Centered mega-panel */}
                  {clubsOpen && (
                    <div
                      ref={panelRef}
                      onMouseEnter={cancelClose}
                      onMouseLeave={scheduleClose}
                      className="
                        fixed left-1/2 -translate-x-1/2 top-[66px]  /* header is 64px; sit just below */
                        w-[min(92vw,60rem)]
                        bg-card border border-border rounded-2xl shadow-2xl z-[60]
                        p-4 sm:p-5
                      "
                      role="menu"
                    >
                      <div className="max-h-[70vh] overflow-auto no-scrollbar">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-3">
                          {clubs.map((c) => (
                            <Link
                              key={c.id}
                              href={`/clubs/${c.id}`}
                              className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-[hsl(var(--background-tertiary))] transition-colors"
                              role="menuitem"
                              onClick={() => setClubsOpen(false)}
                            >
                              {c.badgeUrl ? (
                                <img
                                  src={c.badgeUrl}
                                  alt={`${c.name} crest`}
                                  className="w-6 h-6 object-contain rounded-full border border-border shrink-0"
                                />
                              ) : (
                                <span className="w-6 h-6 surface-2 rounded-full border border-border shrink-0" />
                              )}
                              <span className="text-sm text-foreground truncate" title={c.name} style={{ maxWidth: "14rem" }}>
                                {c.name}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Invisible bridge to prevent hover gap between button and panel */}
                  {clubsOpen && bridgeRect && (
                    <div
                      className="fixed z-[59]"
                      style={{
                        top: "64px", // header height
                        left: bridgeRect.left,
                        width: bridgeRect.width,
                        height: "18px",
                        background: "transparent",
                      }}
                      onMouseEnter={cancelClose}
                      onMouseLeave={scheduleClose}
                    />
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center text-sm font-medium ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                {item.href === "/profile" ? (
                  <span className="inline-flex items-center gap-2">
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="8" r="4" />
                      <path d="M6 20c0-3.314 2.686-6 6-6s6 2.686 6 6" />
                    </svg>
                    <span>Log in</span>
                  </span>
                ) : (
                  item.label
                )}
              </Link>
            );
          })}
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border text-foreground"
          aria-label="Toggle menu"
          aria-expanded={open ? "true" : "false"}
          onClick={() => setOpen((v) => !v)}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Mobile dropdown */}
        {open && (
          <nav className="md:hidden absolute right-4 top-16 bg-card border border-border rounded-xl shadow p-4 flex flex-col gap-2 z-50 min-w-[12rem]">
            {nav.map((item) => {
              const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`px-2 py-1.5 rounded-md text-sm font-medium ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {item.href === "/profile" ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M6 20c0-3.314 2.686-6 6-6s6 2.686 6 6" />
                      </svg>
                      <span>Log in</span>
                    </span>
                  ) : (
                    item.label
                  )}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}