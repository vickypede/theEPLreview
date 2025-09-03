'use client';
import AdminGuard from '@/components/AdminGuard';
import { db } from '@/lib/firebase';
import { addDoc, collection, doc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { useState } from 'react';

export default function AdminPage() {
  return (
    <AdminGuard>
      <Editor />
    </AdminGuard>
  );
}

function Editor() {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('final-whistle');
  const [content, setContent] = useState('');
  const [clubs, setClubs] = useState<string>('arsenal, chelsea');
  const [tags, setTags] = useState<string>('opinion, week-4');
  const [status, setStatus] = useState<'draft'|'review'|'scheduled'|'published'|'archived'>('draft');
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [saving, setSaving] = useState(false);

  async function create() {
    setSaving(true);
    const docRef = await addDoc(collection(db, 'publications'), {
      title,
      type,
      content,
      clubs: clubs.split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
      tags: tags.split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
      status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    setSaving(false);
    alert(`Created: ${docRef.id}`);
  }

  async function publishNow(id: string) {
    setSaving(true);
    await updateDoc(doc(db, 'publications', id), {
      status: 'published',
      publishedAt: serverTimestamp()
    });
    setSaving(false);
  }

  async function schedule(id: string) {
    if (!scheduledAt) return alert('Pick a date/time');
    setSaving(true);
    await updateDoc(doc(db, 'publications', id), {
      status: 'scheduled',
      scheduledAt: Timestamp.fromDate(new Date(scheduledAt))
    });
    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">New Publication</h1>
          
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input 
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                placeholder="Enter publication title" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
              />
            </div>

            {/* Publication Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Publication Type</label>
              <select 
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                value={type} 
                onChange={e => setType(e.target.value)}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Content (Markdown)</label>
              <textarea 
                className="w-full border border-gray-300 rounded-lg px-4 py-3 min-h-[300px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                placeholder="Write your content in markdown format..." 
                value={content} 
                onChange={e => setContent(e.target.value)} 
              />
            </div>

            {/* Clubs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Clubs (comma separated)</label>
              <input 
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                placeholder="arsenal, chelsea, liverpool" 
                value={clubs} 
                onChange={e => setClubs(e.target.value)} 
              />
              <p className="text-sm text-gray-500 mt-1">Use club slugs: arsenal, chelsea, liverpool, etc.</p>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags (comma separated)</label>
              <input 
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                placeholder="opinion, week-4, transfers" 
                value={tags} 
                onChange={e => setTags(e.target.value)} 
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select 
                className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                value={status} 
                onChange={e => setStatus(e.target.value as any)}
              >
                <option value="draft">Draft</option>
                <option value="review">Review</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Schedule */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Schedule for Later</label>
              <input 
                type="datetime-local" 
                className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                value={scheduledAt} 
                onChange={e => setScheduledAt(e.target.value)} 
              />
              <p className="text-sm text-gray-500 mt-1">Leave empty to publish immediately</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button 
                disabled={saving || !title || !content} 
                onClick={create} 
                className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
            </div>

            {/* Help Text */}
            <div className="bg-gray-50 rounded-lg p-4 mt-6">
              <p className="text-sm text-gray-600">
                <strong>Tip:</strong> After creating a publication, you can find it in the Firebase Console. 
                Copy the document ID to test the publish/schedule functions, or extend this UI to list drafts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
