import {
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Publication } from "@/types/publication";

function assertDb(x: unknown): asserts x is NonNullable<typeof db> {
  if (!x) throw new Error("Firestore (db) is not initialized");
}

export const publicationConverter: FirestoreDataConverter<Publication> = {
  toFirestore(p: Publication): DocumentData {
    const rest: Record<string, unknown> = { ...p };
    delete (rest as { id?: unknown }).id; // drop synthetic id; no `any`
    return rest as DocumentData;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Publication {
    const data = snapshot.data(options) as Omit<Publication, "id">;
    return { id: snapshot.id, ...data };
  },
};

export function publicationsRef(): CollectionReference<Publication> {
  assertDb(db);
  return collection(db, "publications").withConverter(publicationConverter);
}

export function publicationDoc(id: string): DocumentReference<Publication> {
  assertDb(db);
  return doc(db, "publications", id).withConverter(publicationConverter);
}
