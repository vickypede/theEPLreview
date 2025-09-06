You did the right idea (force the WASI fallback), but this error means **the Oxide binary package still isn’t present on Vercel at all**, so there’s nothing for Tailwind to “fall back” to. Tailwind v4 uses the Rust “Oxide” engine (native binary per-OS, with a WASI/WASM fallback) and Next’s CSS pipeline invokes it during build; if the platform binary isn’t installed (often because optional deps were skipped or cache/lockfiles point to the wrong OS), the require blows up and Next reports it as a `next/font` failure. ([Tailwind CSS][1], [LogRocket Blog][2])

### Why your flags didn’t help

`NAPI_RS_FORCE_WASI=1` (and similar) only help **after** the Oxide WASI package is available. If the Linux binary (or WASI binary) was never installed because optional deps were omitted or the cache is stale, `require('@tailwindcss/oxide')` throws before any flags matter. (There is a published WASI build `@tailwindcss/oxide-wasm32-wasi`, but the installer needs to fetch the right artifact for the platform.) ([npm][3])

---

## Fix — do these in order (fast path)

1. **Make sure optional deps are not skipped**

* In Vercel → Project → Settings → **Environment Variables**
  • Remove `NPM_FLAGS`/`YARN_FLAGS` like `--omit=optional` / `--ignore-optional` if present.
* In Vercel → **Build & Development Settings**
  • Set **Node.js version = 20**. (Tailwind’s v4 tooling assumes modern Node.) ([Tailwind CSS][4])

2. **Clean lock + reinstall (in `/app`)**

```bash
cd app
rm -rf node_modules package-lock.json
npm install
git add package-lock.json
git commit -m "chore: refresh lockfile for Linux build"
git push
```

3. **Clear Vercel build cache on the next deploy**

* On the failed deployment → **Redeploy** → toggle **“Clear build cache”**.

4. **(Optional but helpful) add a postinstall “safety net”**
   Add this to `app/package.json`:

```json
{
  "scripts": {
    "postinstall": "npm rebuild @tailwindcss/oxide || true"
  },
  "engines": { "node": ">=20" }
}
```

5. **Remove your manual `lightningcss` pin**
   You have `"lightningcss": "1.30.1"` pinned. Let Next manage Lightning CSS to avoid native-binding mismatches:

```bash
npm remove lightningcss
```

> After these, revert your scripts back to plain `next build` (you shouldn’t need the WASI flags anymore).

---

## If it still fails (two robust fallbacks)

**A. Force the WASI build explicitly**
Add the WASI package so it’s definitely present, then rebuild:

```bash
cd app
npm i -D @tailwindcss/oxide @tailwindcss/oxide-wasm32-wasi
git add package.json package-lock.json && git commit -m "add oxide wasm fallback"
git push
```

(Keep Node 20 and clear cache again.) ([npm][3])

**B. Temporary unblock: downgrade Tailwind to v3**
Quick switch (keeps your site shipping while you sort Oxide):

```bash
cd app
npm remove tailwindcss @tailwindcss/postcss
npm i -D tailwindcss@^3 postcss autoprefixer
# in globals.css switch to:
# @tailwind base; @tailwind components; @tailwind utilities;
# add a standard postcss.config.js if missing:
# module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } }
git add -A && git commit -m "temp: tailwind v3 fallback" && git push
```

Later, re-upgrade to v4. ([LogRocket Blog][2])

---

### Notes you can ignore unless relevant

* The “Failed to fetch one or more git submodules” warning is harmless unless you actually use submodules.
* Seeing “Restored build cache” in the log is a hint: bad cached binaries are a common cause; clearing cache usually fixes it. ([GitHub][5])

Ping me with the next build log if anything still complains; we’ll read the specific module name it’s trying to load and nail it.

[1]: https://tailwindcss.com/blog/tailwindcss-v4?utm_source=chatgpt.com "Tailwind CSS v4.0"
[2]: https://blog.logrocket.com/exploring-tailwind-oxide/?utm_source=chatgpt.com "Exploring Tailwind Oxide"
[3]: https://www.npmjs.com/package/%40tailwindcss%2Foxide-wasm32-wasi?utm_source=chatgpt.com "tailwindcss/oxide-wasm32-wasi"
[4]: https://tailwindcss.com/docs/upgrade-guide?utm_source=chatgpt.com "Upgrade guide - Getting started"
[5]: https://github.com/tailwindlabs/tailwindcss/discussions/18427 "Tailwind CSS v4.x (@tailwindcss/oxide) native binary not installing on WSL2 / Win 11 Pro, postinstall script reports success but file is missing. · tailwindlabs tailwindcss · Discussion #18427 · GitHub"
