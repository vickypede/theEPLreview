import { Timestamp } from "firebase/firestore";

export type PublicationType =
  | "final-whistle"
  | "matchday-radar"
  | "full-time-verdict"
  | "pretender-list"
  | "high-press"
  | "mailbox"
  | "big-match-review"; // Add your custom type

export type PublicationStatus = "draft" | "review" | "scheduled" | "published" | "archived";

export interface Publication {
  id: string;
  type: PublicationType;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImage?: string | null;
  clubs: string[];
  tags: string[];
  authorId: string;
  authorByline?: string;
  status: PublicationStatus;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  publishedAt?: Timestamp | Date;
  scheduledAt?: Timestamp | Date;
  readingTime?: number;
  wordCount?: number;
  seoTitle?: string;
  seoDescription?: string;
}
