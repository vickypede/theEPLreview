'use client';

import AdminGuard from '@/components/AdminGuard';
import { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getStorage } from 'firebase/storage';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminEditor />
    </AdminGuard>
  );
}

function AdminEditor() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'final-whistle' | 'matchday-radar' | 'big-match-review' | 'match-report' | 'editorial' | 'analysis'>('editorial');
  const [status, setStatus] = useState<'draft' | 'review'>('draft');
  const [excerpt, setExcerpt] = useState('');
  const [featuredImage, setFeaturedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const storage = getStorage();

  const generateExcerpt = () => {
    const stripped = content.replace(/[#*`]/g, '').trim();
    const words = stripped.split(' ').slice(0, 25);
    setExcerpt(words.join(' ') + (words.length === 25 ? '...' : ''));
  };

  const computeStats = () => {
    const words = content.trim().split(/\s+/).length;
    const readingTime = Math.ceil(words / 200);
    return { wordCount: words, readingTime };
  };

  const generateSlug = () => {
    return title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFeaturedImage(file);
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const timestamp = Date.now();
    const fileName = `publications/${timestamp}_${file.name}`;
    const storageRef = ref(storage, fileName);
    
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  };

  const create = async () => {
    if (!auth?.currentUser || !db) return;
    
    setSaving(true);
    setUploading(true);

    try {
      let imageURL = '';
      
      // Upload image if selected
      if (featuredImage) {
        imageURL = await uploadImage(featuredImage);
      }

      const { wordCount, readingTime } = computeStats();
      const slug = generateSlug();

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

  const isFormValid = title.trim() && content.trim() && excerpt.trim();

  return (
    <div className="min-h-screen surface p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-3xl shadow-lg p-8 mb-8 border border-border">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Create Publication</h1>
              <p className="text-muted">Write and publish your Premier League content</p>
            </div>
            <button 
              onClick={() => router.push('/')}
              className="px-6 py-3 border border-border text-foreground rounded-2xl font-medium transition-all duration-200 hover:opacity-90"
            >
              Back to Home
            </button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); create(); }} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">📝 Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-border rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-all duration-200 placeholder:text-muted surface"
                placeholder="🔥 Enter your publication title here..."
                required
              />
            </div>

            {/* Type and Status */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">🏷️ Content Type *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as 'final-whistle' | 'matchday-radar' | 'big-match-review' | 'match-report' | 'editorial' | 'analysis')}
                  className="w-full border border-border rounded-2xl p-4 surface"
                >
                  <option value="editorial">Editorial</option>
                  <option value="analysis">Analysis</option>
                  <option value="match-report">Match Report</option>
                  <option value="big-match-review">Big Match Review</option>
                  <option value="matchday-radar">Matchday Radar</option>
                  <option value="final-whistle">Final Whistle</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">📊 Status *</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'draft' | 'review')}
                  className="w-full border border-border rounded-2xl p-4 surface"
                >
                  <option value="draft">Draft</option>
                  <option value="review">Review</option>
                </select>
              </div>
            </div>

            {/* Featured Image */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">🖼️ Featured Image</label>
              <div className="space-y-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full border border-border rounded-2xl p-4 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold surface"
                />
                
                {imagePreview && (
                  <div className="border border-border rounded-2xl p-4 surface-2">
                    <p className="text-sm font-medium text-foreground mb-2">Image Preview:</p>
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="max-w-full h-48 object-cover rounded-xl"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">📝 Content *</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                className="w-full border border-border rounded-2xl p-4 font-mono text-sm placeholder:text-muted surface"
                placeholder="📝 Write your content in markdown format here... Start with a compelling introduction..."
                required
              />
            </div>

            {/* Excerpt */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-foreground">📖 Excerpt *</label>
                <button
                  type="button"
                  onClick={generateExcerpt}
                  className="px-3 py-1 surface-2 hover:opacity-90 text-foreground rounded-lg text-sm font-medium border border-border"
                >
                  Auto-generate
                </button>
              </div>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={3}
                className="w-full border border-border rounded-2xl p-4 placeholder:text-muted surface"
                placeholder="💬 Brief summary of your article (auto-generated if empty)..."
                required
              />
            </div>

            {/* SEO Fields */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">🔍 SEO Title</label>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  className="w-full border border-border rounded-2xl p-4 placeholder:text-muted surface"
                  placeholder="🔍 SEO optimized title (defaults to main title)"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">📝 SEO Description</label>
                <textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  rows={2}
                  className="w-full border border-border rounded-2xl p-4 placeholder:text-muted surface"
                  placeholder="🔍 SEO description for search engines (defaults to excerpt)..."
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="text-center pt-6">
              <button
                type="submit"
                disabled={!isFormValid || saving}
                className="bg-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-semibold py-4 px-12 rounded-2xl transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                {saving ? (
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></div>
                    {uploading ? 'Uploading Image...' : 'Creating Publication...'}
                  </div>
                ) : (
                  `Create ${status === 'draft' ? 'Draft' : 'Review'}`
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
