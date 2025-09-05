gotcha—here’s what I’d do on mobile, plus drop-in edits.

## What’s “standard” on mobile (and what’s best here)

* **Cards layout**

  * Stack the **primary feed** vertically (one column). Avoid 2–3 columns on tiny screens—tap targets get cramped and lines wrap ugly.
  * Use **horizontal carousels** only when cards are sibling “modules” (e.g., your 6 club tiles). One-hand scrolling feels natural horizontally for these.
  * Keep **tap targets ≥44px**, clamp titles to 2 lines, and avoid nested scrolls unless you’re expressly paging (you already do this for LATEST NEWS).

* **Mobile nav (hamburger)**

  * Use a **full-width “sheet”** that slides down under the header (not a tiny floating popover).
  * Make **“Clubs” an accordion** inside that sheet: tap to expand a 2-column list with crests + names; it scrolls independently. Tapping a club closes the menu.
  * Don’t show the desktop mega-menu on touch; keep behavior click-only and predictable.

Below are **small, surgical patches** for your current file.

---

## 1) Mobile menu: turn the popover into a full-width sheet + “Clubs” accordion

**Add state (near the top):**

```tsx
const [mobileClubsOpen, setMobileClubsOpen] = useState(false);
```

**Replace your mobile `<nav ...>` block (inside `{open && (...)}`) with this:**

```tsx
{open && (
  <nav
    className="
      md:hidden fixed inset-x-0 top-16
      bg-card border-t border-border shadow-2xl z-50
      max-h-[calc(100vh-4rem)] overflow-y-auto
      p-4
    "
  >
    {/* Regular items, but “Clubs” becomes an accordion */}
    {nav.map((item) => {
      const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

      if (item.href === "/clubs") {
        return (
          <div key="mobile-clubs" className="mb-2">
            <button
              type="button"
              aria-expanded={mobileClubsOpen ? "true" : "false"}
              onClick={() => setMobileClubsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-2 py-2 rounded-md text-sm font-medium
                         text-foreground bg-[hsl(var(--background-secondary))] border border-border"
            >
              <span>Clubs</span>
              <svg
                className={`w-4 h-4 transition-transform ${mobileClubsOpen ? "rotate-180" : ""}`}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {mobileClubsOpen && (
              <div className="mt-2 grid grid-cols-2 gap-2 max-h-80 overflow-auto no-scrollbar">
                {clubs.map((c) => (
                  <Link
                    key={c.id}
                    href={`/clubs/${c.id}`}
                    onClick={() => { setOpen(false); setMobileClubsOpen(false); }}
                    className="flex items-center gap-2 p-2 rounded-md border border-border hover:bg-[hsl(var(--background-tertiary))]"
                  >
                    {c.badgeUrl ? (
                      <img src={c.badgeUrl} alt={`${c.name} crest`} className="w-6 h-6 object-contain rounded-full border border-border" />
                    ) : (
                      <span className="w-6 h-6 surface-2 rounded-full border border-border" />
                    )}
                    <span className="text-sm truncate">{c.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      }

      // All other items
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setOpen(false)}
          className={`block px-2 py-2 rounded-md text-sm font-medium ${
            active ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {item.href === "/profile" ? (
            <span className="inline-flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                   strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
```

**Why:** full-width sheet = zero overflow issues; accordion keeps the nav short by default; the 2-col grid makes clubs scannable with big touch targets.

---

## 2) Mobile card layout for the homepage (Landing)

This is the pattern I recommend:

* **LATEST NEWS**: keep your existing **swipeable pages** (you already have this).
* **Club tiles**: use a **horizontal carousel** on mobile; fall back to your current grid on tablet/desktop.

**Patch the clubs container in your Landing page** (replace the current container that starts with `lg:col-span-2 grid ...`):

```tsx
{/* Right: 6 club tiles */}
<div className="lg:col-span-2">
  {/* Mobile: horizontal carousel */}
  <div className="md:hidden -mx-4 px-4 overflow-x-auto no-scrollbar snap-x snap-mandatory">
    <div className="flex gap-4">
      {clubTiles.map((c, i) => {
        const brand = c?.id ? CLUB_BRAND[c.id] ?? "#4f46e5" : "#4f46e5";
        const tint = hexToRgba(brand, 0.04);
        return (
          <article
            key={c?.id ?? i}
            className="card border-0 p-0 flex flex-col min-w-[280px] max-w-[280px] snap-start"
            style={{ backgroundImage: `linear-gradient(180deg, ${tint}, transparent)` }}
          >
            {/* ...same inner markup as your card... */}
          </article>
        );
      })}
    </div>
  </div>

  {/* Tablet/desktop: your existing grid */}
  <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-3 gap-6">
    {/** render the same cards here without the min-w/max-w classes **/}
  </div>
</div>
```

**Why:** on phones, a carousel lets people peek at more clubs quickly; on larger screens, the grid is more efficient.

---

## 3) Small UX touches you’ll feel immediately

* Give list rows **bigger vertical padding on mobile**: `py-3` feels easier to tap than `py-2`.
* Clamp headlines: `line-clamp-2` on card titles; don’t let text wrap below icon rows.
* Keep **only one scroll per region**. Your news list already avoids nested scrolls on mobile—good.

---

If you want, I can also consolidate a single `Clubs` **search** field at the top of the mobile accordion. But the two changes above will already make the mobile experience feel “native” and predictable.
