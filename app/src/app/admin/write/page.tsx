'use client';

import AdminGuard from '@/components/AdminGuard';
import { useEffect, useMemo, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage';
import { useRouter } from 'next/navigation';

export default function AdminWritePage() {
  return (
    <AdminGuard>
      <AdminEditor />
    </AdminGuard>
  );
}

type PubType =
  | 'final-whistle'
  | 'matchday-radar'
  | 'big-match-review'
  | 'match-report'
  | 'editorial'
  | 'analysis';

type PubStatus = 'draft' | 'review';

function AdminEditor() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<PubType>('editorial');
  const [status, setStatus] = useState<PubStatus>('draft');
  const [excerpt, setExcerpt] = useState('');
  const [featuredImage, setFeaturedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const storage = getStorage();

  // ---------- helpers ----------
  const generateExcerpt = () => {
    const stripped = content.replace(/[#*_`>~\-]|!\[.*?\]\(.*?\)|\[(.*?)\]\(.*?\)/g, '').trim();
    const words = stripped.split(/\s+/).filter(Boolean).slice(0, 30);
    setExcerpt(words.join(' ') + (words.length === 30 ? '…' : ''));
  };

  const computeStats = () => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const readingTime = Math.max(1, Math.ceil(words / 200));
    return { wordCount: words, readingTime };
  };

  const slug = useMemo(() => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }, [title]);

  const handleImageChange = (file?: File) => {
    const f = file || null;
    if (!f) return;
    setFeaturedImage(f);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(String(e.target?.result || ''));
    reader.readAsDataURL(f);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const timestamp = Date.now();
    const fileName = `publications/${timestamp}_${file.name}`;
    const storageRef = ref(storage, fileName);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const create = async () => {
    if (!auth?.currentUser || !db) return;

    setSaving(true);
    setUploading(!!featuredImage);

    try {
      let imageURL = '';

      if (featuredImage) {
        imageURL = await uploadImage(featuredImage);
      }

      const { wordCount, readingTime } = computeStats();

      await addDoc(collection(db!, 'publications'), {
        title,
        content,
        type,
        status,
        excerpt,
        featuredImage: imageURL,
        seoTitle: seoTitle || title,
        seoDescription: seoDescription || excerpt,
        slug,
        authorId: auth.currentUser.uid,
        authorByline: auth.currentUser.displayName || auth.currentUser.email,
        wordCount,
        readingTime,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Reset form
      setTitle('');
      setContent('');
      setType('editorial');
      setStatus('draft');
      setExcerpt('');
      setFeaturedImage(null);
      setImagePreview('');
      setSeoTitle('');
      setSeoDescription('');

      alert('Publication created successfully!');
    } catch (error) {
      console.error('Error creating publication:', error);
      alert('Error creating publication. Please try again.');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const isFormValid = Boolean(title.trim() && content.trim() && excerpt.trim());
  const { wordCount, readingTime } = computeStats();

  // Cmd/Ctrl+S to submit
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isSave = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's';
      if (isSave) {
        e.preventDefault();
        if (isFormValid && !saving) create();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFormValid, saving, title, content, excerpt, type, status, seoTitle, seoDescription, slug]);

  // ---------- UI ----------
  return (
    <div className="min-h-screen surface section-y">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold font-heading">Create publication</h1>
            <p className="text-muted-foreground text-sm">Write and publish your Premier League content</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge" title="Approximate reading time">
              ⏱ {readingTime} min
            </span>
            <span className="badge" title="Word count">
              {wordCount.toLocaleString()} words
            </span>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {/* Left column: main editor */}
          <div className="lg:col-span-8 space-y-6">
            {/* Title / Slug */}
            <section className="card p-5">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input"
                placeholder="🔥 Enter your publication title…"
                required
              />
              <div className="mt-2 text-xs text-muted-foreground">
                Slug: <span className="text-foreground">{slug || '—'}</span>
              </div>
            </section>

            {/* Content */}
            <section className="card p-5">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-foreground">Content *</label>
                <span className="text-xs text-muted-foreground">Markdown supported</span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={16}
                className="textarea font-mono text-sm"
                placeholder="Write your content in Markdown…"
                required
              />
            </section>

            {/* Excerpt */}
            <section className="card p-5">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-foreground">Excerpt *</label>
                <button
                  type="button"
                  onClick={generateExcerpt}
                  className="btn btn-ghost text-sm"
                >
                  Auto-generate
                </button>
              </div>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={3}
                className="textarea"
                placeholder="Brief summary (used on cards & SEO if blank)…"
                required
              />
            </section>

            {/* SEO */}
            <section className="card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">SEO</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">SEO Title</label>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    className="input"
                    placeholder="Defaults to Title"
                  />
                  <div className="mt-1 text-[11px] text-muted-foreground">{seoTitle.length}/60</div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">SEO Description</label>
                  <textarea
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    rows={3}
                    className="textarea"
                    placeholder="Defaults to Excerpt"
                  />
                  <div className="mt-1 text-[11px] text-muted-foreground">{seoDescription.length}/160</div>
                </div>
              </div>
            </section>
          </div>

          {/* Right column: meta & image */}
          <aside className="lg:col-span-4 space-y-6">
            {/* Meta */}
            <section className="card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">Meta</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Content type *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as PubType)}
                    className="select bg-[hsl(var(--background-secondary))] border-[hsl(var(--border))] text-foreground hover:bg-[hsl(var(--background-tertiary))] focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--ring))] transition-colors"
                  >
                    <option value="editorial" className="bg-[hsl(var(--background-secondary))] text-foreground">Editorial</option>
                    <option value="analysis" className="bg-[hsl(var(--background-secondary))] text-foreground">Analysis</option>
                    <option value="match-report" className="bg-[hsl(var(--background-secondary))] text-foreground">Match Report</option>
                    <option value="big-match-review" className="bg-[hsl(var(--background-secondary))] text-foreground">Big Match Review</option>
                    <option value="matchday-radar" className="bg-[hsl(var(--background-secondary))] text-foreground">Matchday Radar</option>
                    <option value="final-whistle" className="bg-[hsl(var(--background-secondary))] text-foreground">Final Whistle</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Status *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setStatus('draft')}
                      className={`btn ${status === 'draft' ? 'btn-primary' : 'btn-ghost'}`}
                    >
                      Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('review')}
                      className={`btn ${status === 'review' ? 'btn-primary' : 'btn-ghost'}`}
                    >
                      Review
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Image uploader */}
            <section className="card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">Featured image</h2>

              <div
                className={`
                  border-2 border-dashed rounded-[var(--radius-card)]
                  ${isDragging ? 'border-[hsl(var(--ring))] surface-2' : 'border-border surface-2'}
                  p-4 text-center transition
                `}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleImageChange(f);
                }}
              >
                <input
                  id="file"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e.target.files?.[0])}
                  className="hidden"
                />
                <label htmlFor="file" className="cursor-pointer inline-flex flex-col items-center">
                  <svg className="w-8 h-8 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <span className="text-sm">Click to upload or drag & drop</span>
                  <span className="text-xs text-muted-foreground">PNG, JPG up to ~5MB</span>
                </label>
              </div>

              {imagePreview && (
                <div className="mt-3 surface-2 border border-border rounded-[var(--radius-card)] p-3">
                  <p className="text-xs text-muted-foreground mb-2">Preview</p>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-40 object-cover rounded-[var(--radius-card)]"
                  />
                </div>
              )}
            </section>

            {/* Primary actions (sticky on desktop) */}
            <section className="card p-4 sticky top-[88px] space-y-3">
              <button
                type="submit"
                disabled={!isFormValid || saving}
                className="btn btn-primary w-full disabled:opacity-60"
              >
                {saving ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></span>
                    {uploading ? 'Uploading image…' : 'Creating…'}
                  </span>
                ) : (
                  `Create ${status === 'draft' ? 'draft' : 'review'}`
                )}
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin')}
                className="btn w-full"
              >
                Back to Admin
              </button>
            </section>
          </aside>
        </form>
      </div>
    </div>
  );
}
