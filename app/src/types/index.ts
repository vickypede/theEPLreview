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
}
