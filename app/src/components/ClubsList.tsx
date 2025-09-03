"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Club } from '@/types';

type UiClub = Club;

export default function ClubsList() {
  const [clubs, setClubs] = useState<UiClub[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        if (!db) return;
        const clubsRef = collection(db, 'clubs');
        const snapshot = await getDocs(clubsRef);
        const list = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Club, 'id'>) })) as UiClub[];
        // Sort by isTop6 (desc) then by name (asc)
        list.sort((a, b) => {
          if (a.isTop6 !== b.isTop6) return a.isTop6 ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        if (mounted) setClubs(list);
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (!db) return null;

  if (loading) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-muted-foreground mb-4">Loading…</h2>
      </div>
    );
  }

  if (clubs.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-muted-foreground mb-4">No clubs found</h2>
        <p className="text-muted-foreground">Seed the clubs collection to view club pages.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-lg font-bold text-foreground">Premier League Clubs</h1>
      </div>
      <div className="grid gap-3 sm:gap-4 md:gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {clubs.map((club) => (
          <Link key={club.id} href={`/clubs/${club.id}`} className="block bg-card rounded-lg shadow p-3 sm:p-4 md:p-5 hover:shadow-md transition-shadow border border-border">
            <div className="flex items-center gap-2 sm:gap-3">
              {club.badgeUrl && (
                <img 
                  src={club.badgeUrl} 
                  alt={`${club.name} crest`}
                  className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 object-contain flex-shrink-0"
                  onError={(e) => {
                    // Fallback to text if image fails to load
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <h3 className="text-sm sm:text-base md:text-lg font-semibold text-foreground truncate">{club.name}</h3>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}


