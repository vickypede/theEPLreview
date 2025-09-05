That’s called **responsive design**. A website changes its layout depending on the device’s screen size. Developers do this mainly with **CSS media queries** and sometimes with **JavaScript**.

For example, the header navigation:

* **On desktop (wide screens):** links are shown across the top (`Home | Clubs | Mailbox | Login`).
* **On mobile (narrow screens):** those links would take up too much space, so CSS hides them and shows a small **hamburger icon (☰)**.
  When you tap the icon, JavaScript toggles a menu that slides down or opens as a drawer.

Here’s a very simplified example with **Tailwind CSS** (which your `app/globals.css` and `Header.tsx` in the repo use):

```tsx
// components/Header.tsx
'use client';
import { useState } from 'react';

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex items-center justify-between p-4 bg-gray-900 text-white">
      <div className="text-xl font-bold">TheEPLReview</div>
      {/* Desktop menu */}
      <nav className="hidden md:flex gap-4">
        <a href="/">Home</a>
        <a href="/clubs">Clubs</a>
        <a href="/mailbox">Mailbox</a>
      </nav>
      {/* Mobile hamburger */}
      <button
        className="md:hidden"
        onClick={() => setOpen(!open)}
      >
        ☰
      </button>
      {/* Mobile dropdown */}
      {open && (
        <div className="absolute top-16 right-4 bg-gray-800 rounded-md shadow-md p-4 flex flex-col gap-2 md:hidden">
          <a href="/">Home</a>
          <a href="/clubs">Clubs</a>
          <a href="/mailbox">Mailbox</a>
        </div>
      )}
    </header>
  );
}
```

Key things happening here:

* `hidden md:flex`: menu is hidden on small screens, shown on `md` (≥768px).
* `md:hidden`: hamburger only appears on mobile.
* `useState` controls whether the mobile dropdown is visible.

👉 That’s how sites decide whether to show a **full header** or a **hamburger menu**.

Do you want me to adjust your existing `Header.tsx` (in `app/src/components`) so it behaves exactly like this?
