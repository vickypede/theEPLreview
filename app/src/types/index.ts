import { Timestamp } from 'firebase/firestore';

export interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: { toDate: () => Date }; // Firestore Timestamp
  clubs: string[];
  content?: string;
  summary?: string;
}

export interface Club {
  id: string;
  name: string;
  isTop6: boolean;
  names: string[];
  ambiguous: string[];
  scoreAxisId?: number; // ScoreAxis widget ID for team stats
  badgeUrl?: string; // Official club badge URL
}

// Profile system types
export type ClubSlug = string; // e.g. 'chelsea', 'arsenal', etc.

export interface UserProfile {
  displayName: string;
  email: string;                // immutable by user; from auth
  favoriteClub: ClubSlug | null;    // one main club
  followedClubs: ClubSlug[];        // multi-select
  includeGeneral: boolean;          // show general league-wide items
  emailNotifications: boolean;       // send breaking news via email
  marketingOptIn: boolean;          // send product and marketing news via email
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}
