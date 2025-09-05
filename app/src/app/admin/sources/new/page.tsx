'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import { db } from '@/lib/firebase';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';

type Club = {
  id: string;
  name: string;
  isTop6?: boolean;
};

type SourceType = 'rss' | 'html';

function toKey(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function AddSourcePage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);

  // form state
  const [name, setName] = useState('');
  const [customKey, setCustomKey] = useState(''); // optional: doc id slug (e.g., "arsenal-arseblog")
  const [type, setType] = useState<SourceType>('rss');
  const [url, setUrl] = useState('');
  const [clubSlugs, setClubSlugs] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [includePathRegex, setIncludePathRegex] = useState('');
  const [includeTitle, setIncludeTitle] = useState(''); // comma-separated
  const [excludeTitle, setExcludeTitle] = useState(''); // comma-separated
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const inferredKey = useMemo(() => (customKey ? toKey(customKey) : toKey(name)), [customKey, name]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!db) return;
      try {
        const snap = await getDocs(collection(db, 'clubs'));
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Club[];
        // Top 6 first, then name
        list.sort((a, b) => {
          if ((a.isTop6 ? 1 : 0) !== (b.isTop6 ? 1 : 0)) return a.isTop6 ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        if (mounted) setClubs(list);
      } finally {
        if (mounted) setLoadingClubs(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const toggleClub = (slug: string) => {
    setClubSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    if (!name.trim() || !url.trim()) {
      alert('Name and URL are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        url: url.trim(),
        clubSlugs,
        isActive,
        includePathRegex: includePathRegex.trim() || null,
        includeTitle: includeTitle
          ? includeTitle.split(',').map((s) => s.trim()).filter(Boolean)
          : null,
        excludeTitle: excludeTitle
          ? excludeTitle.split(',').map((s) => s.trim()).filter(Boolean)
          : null,
        failureCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (inferredKey) {
        await setDoc(doc(db, 'sources', inferredKey), payload, { merge: true });
      } else {
        await addDoc(collection(db, 'sources'), payload);
      }

      // reset form
      setName('');
      setCustomKey('');
      setType('rss');
      setUrl('');
      setClubSlugs([]);
      setIsActive(true);
      setIncludePathRegex('');
      setIncludeTitle('');
      setExcludeTitle('');

      alert('Source added.');
    } catch (err) {
      console.error(err);
      alert('Failed to add source. Check console.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminGuard>
      <div className="min-h-screen surface section-y">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-lg font-bold font-heading">Add Source</h1>
            <p className="text-muted-foreground text-sm">
              Add an RSS/HTML source and (optionally) constrain by path/title filters.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-12">
            <section className="card p-5 md:col-span-8 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  placeholder="e.g., Arseblog"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Custom Key (optional)</label>
                <input
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  className="input"
                  placeholder="e.g., arsenal-arseblog (slug). Leave blank to auto-generate from name."
                />
                <p className="text-[11px] text-muted-foreground mt-1">Will save as <code>{inferredKey || '—'}</code></p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Type *</label>
                  <select value={type} onChange={(e) => setType(e.target.value as SourceType)} className="select">
                    <option value="rss">RSS</option>
                    <option value="html">HTML</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">URL *</label>
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="input"
                    placeholder="https://example.com/feed or https://site/club/news"
                    required
                  />
                </div>
              </div>

              <button type="button" onClick={() => setShowAdvanced(v => !v)} className="btn btn-ghost text-sm">
                {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
              </button>

              {showAdvanced && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Include Path Regex (optional)</label>
                  <input
                    value={includePathRegex}
                    onChange={(e) => setIncludePathRegex(e.target.value)}
                    className="input"
                    placeholder="/arsenal|/teams/arsenal"
                  />
                </div>
              )}

              {showAdvanced && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Include Title (comma-separated)</label>
                    <input
                      value={includeTitle}
                      onChange={(e) => setIncludeTitle(e.target.value)}
                      className="input"
                      placeholder="Arsenal,Gunners,AFC"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Exclude Title (comma-separated)</label>
                    <input
                      value={excludeTitle}
                      onChange={(e) => setExcludeTitle(e.target.value)}
                      className="input"
                      placeholder="Chelsea,Manchester City"
                    />
                  </div>
                </div>
              )}
            </section>

            <aside className="md:col-span-4 space-y-6">
              <section className="card p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">Clubs</h2>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="mr-2"
                    />
                    Active
                  </label>
                </div>
                <div className="mt-3 max-h-64 overflow-auto space-y-2">
                  {loadingClubs ? (
                    <div className="text-sm text-muted-foreground">Loading clubs…</div>
                  ) : clubs.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No clubs found. Seed the clubs collection.</div>
                  ) : (
                    clubs.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={clubSlugs.includes(c.id)}
                          onChange={() => toggleClub(c.id)}
                        />
                        <span>{c.name}</span>
                        {c.isTop6 && <span className="ml-auto text-[10px] px-1 py-0.5 rounded surface-2 border border-border">Top-6</span>}
                      </label>
                    ))
                  )}
                </div>
              </section>

              <section className="card p-4 sticky top-[88px] space-y-3">
                <button
                  type="submit"
                  disabled={saving || !name.trim() || !url.trim()}
                  className="btn btn-primary w-full disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Add Source'}
                </button>
                <a href="/admin" className="btn w-full text-center">Back to Admin</a>
              </section>
            </aside>
          </form>
        </div>
      </div>
    </AdminGuard>
  );
}
