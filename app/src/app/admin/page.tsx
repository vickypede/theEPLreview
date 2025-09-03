'use client';
import AdminGuard from '@/components/AdminGuard';
import { db, auth } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useState } from 'react';
import { signOut } from 'firebase/auth';

export default function AdminPage() {
  return (
    <AdminGuard>
      <Editor />
    </AdminGuard>
  );
}

function Editor() {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'final-whistle'|'matchday-radar'|'full-time-verdict'|'pretender-list'|'high-press'|'mailbox'>('final-whistle');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [clubs, setClubs] = useState<string>('arsenal, chelsea');
  const [tags, setTags] = useState<string>('opinion, week-4');
  const [status, setStatus] = useState<'draft'|'review'|'scheduled'|'published'|'archived'>('draft');
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Auto-generate excerpt from content
  const generateExcerpt = (text: string) => {
    return text.substring(0, 160).trim() + (text.length > 160 ? '...' : '');
  };

  // Compute word count and reading time
  const computeStats = (text: string) => {
    const words = text.trim().split(/\s+/).length;
    const readingTime = Math.ceil(words / 200); // Average reading speed
    return { wordCount: words, readingTime };
  };

  // Auto-generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  async function create() {
    if (!db || !auth?.currentUser) {
      alert('Database or user not available');
      return;
    }

    // Validation
    if (status === 'scheduled' && !scheduledAt) {
      alert('Please set a schedule date when status is "scheduled"');
      return;
    }

    if (status === 'published' && !excerpt) {
      setExcerpt(generateExcerpt(content));
    }

    setSaving(true);
    
    try {
      const { wordCount, readingTime } = computeStats(content);
      const slug = generateSlug(title);
      
      const publicationData = {
        type,
        title,
        slug,
        content,
        excerpt: excerpt || generateExcerpt(content),
        featuredImage: featuredImage || null,
        clubs: clubs.split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
        tags: tags.split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
        authorId: auth!.currentUser!.uid,
        authorByline: auth!.currentUser!.displayName || auth!.currentUser!.email || 'Anonymous',
        status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        wordCount,
        readingTime,
        seoTitle: seoTitle || title,
        seoDescription: seoDescription || (excerpt || generateExcerpt(content)),
        ...(status === 'published' && { publishedAt: serverTimestamp() }),
        ...(status === 'scheduled' && scheduledAt && { 
          scheduledAt: Timestamp.fromDate(new Date(scheduledAt)),
          scheduledAtDate: new Date(scheduledAt)
        })
      };

      const docRef = await addDoc(collection(db, 'publications'), publicationData);
      setSaving(false);
      alert(`Publication created successfully! ID: ${docRef.id}`);
      
      // Reset form for next publication
      setTitle('');
      setContent('');
      setExcerpt('');
      setFeaturedImage('');
      setClubs('arsenal, chelsea');
      setTags('opinion, week-4');
      setStatus('draft');
      setScheduledAt('');
      setSeoTitle('');
      setSeoDescription('');
      
    } catch (error) {
      setSaving(false);
      alert(`Error creating publication: ${error}`);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700">
          {/* Header with Logout Button */}
          <div className="flex justify-between items-center mb-8">
            <div className="text-center flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">New Publication</h1>
              <p className="text-gray-600 dark:text-gray-400">Create your next editorial piece</p>
            </div>
            <button
              onClick={() => signOut(auth!)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
          
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Title *</label>
              <input 
                className="w-full border-2 border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400" 
                placeholder="🔥 Enter your publication title here..." 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
              />
            </div>

            {/* Publication Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Publication Type *</label>
              <select 
                className="w-full border-2 border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                value={type} 
                onChange={e => setType(e.target.value as any)}
              >
                <option value="final-whistle">Final Whistle - Weekend conclusions</option>
                <option value="matchday-radar">Matchday Radar - Pre-match analysis</option>
                <option value="full-time-verdict">Full-Time Verdict - Big match review</option>
                <option value="pretender-list">Pretender List - Fraud Watch</option>
                <option value="high-press">High Press - House opinion</option>
                <option value="mailbox">Mailbox - Fan letters</option>
              </select>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Content (Markdown) *</label>
              <textarea 
                className="w-full border-2 border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 min-h-[300px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-y" 
                placeholder="📝 Write your content in markdown format here... Start with a compelling introduction..." 
                value={content} 
                onChange={e => setContent(e.target.value)} 
              />
              {content && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                  📊 {computeStats(content).wordCount} words • ⏱️ ~{computeStats(content).readingTime} min read
                </div>
              )}
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Excerpt</label>
              <textarea 
                className="w-full border-2 border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-y" 
                placeholder="💬 Brief summary of your article (auto-generated if empty)..." 
                value={excerpt} 
                onChange={e => setExcerpt(e.target.value)} 
                maxLength={160}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {excerpt.length}/160 characters. Leave empty to auto-generate from content.
              </p>
            </div>

            {/* Featured Image */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Featured Image URL</label>
              <input 
                className="w-full border-2 border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400" 
                placeholder="🖼️ https://example.com/image.jpg (optional)" 
                value={featuredImage} 
                onChange={e => setFeaturedImage(e.target.value)} 
              />
            </div>

            {/* Clubs */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Clubs (comma separated)</label>
              <input 
                className="w-full border-2 border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400" 
                placeholder="⚽ arsenal, chelsea, liverpool (use club slugs)" 
                value={clubs} 
                onChange={e => setClubs(e.target.value)} 
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Use club slugs: arsenal, chelsea, liverpool, etc.</p>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tags (comma separated)</label>
              <input 
                className="w-full border-2 border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400" 
                placeholder="🏷️ opinion, week-4, transfers, analysis" 
                value={tags} 
                onChange={e => setTags(e.target.value)} 
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Status *</label>
              <select 
                className="border-2 border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                value={status} 
                onChange={e => setStatus(e.target.value as any)}
              >
                <option value="draft">📝 Draft</option>
                <option value="review">👀 Review</option>
                <option value="scheduled">⏰ Scheduled</option>
                <option value="published">✅ Published</option>
                <option value="archived">📦 Archived</option>
              </select>
            </div>

            {/* Schedule */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Schedule for Later {status === 'scheduled' && <span className="text-red-500">*</span>}
              </label>
              <input 
                type="datetime-local" 
                className="border-2 border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                value={scheduledAt} 
                onChange={e => setScheduledAt(e.target.value)} 
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {status === 'scheduled' ? '⏰ Required when status is "Scheduled"' : '⏰ Leave empty to publish immediately'}
              </p>
            </div>

            {/* SEO Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">SEO Title</label>
              <input 
                className="w-full border-2 border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400" 
                placeholder="🔍 SEO optimized title (defaults to main title)" 
                value={seoTitle} 
                onChange={e => setSeoTitle(e.target.value)} 
              />
            </div>

            {/* SEO Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">SEO Description</label>
              <textarea 
                className="w-full border-2 border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-y" 
                placeholder="🔍 SEO description for search engines (defaults to excerpt)..." 
                value={seoDescription} 
                onChange={e => setSeoDescription(e.target.value)} 
                maxLength={160}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {seoDescription.length}/160 characters. Leave empty to use excerpt.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6">
              <button 
                disabled={saving || !title || !content || (status === 'scheduled' && !scheduledAt)} 
                onClick={create} 
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                {saving ? '⏳ Creating...' : `🚀 Create ${status === 'draft' ? 'Draft' : status === 'published' ? 'Publication' : status === 'scheduled' ? 'Scheduled Post' : 'Publication'}`}
              </button>
            </div>

            {/* Help Text */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mt-6 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>💡 Tip:</strong> The system will auto-generate slug, excerpt, word count, and reading time. 
                When you publish, it automatically sets the publishedAt timestamp. Scheduled posts will be published automatically by the Cloud Function.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
