import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  limit, 
  writeBatch,
  CollectionReference,
  DocumentReference,
  Query,
  DocumentData,
} from 'firebase/firestore';
import firebaseConfig from '../../../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);

function sanitizeForFirestore(data: any): any {
  if (data === undefined) return null;
  if (data === null || typeof data !== 'object') return data;
  if (data instanceof Date) return data;
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item));
  }
  const clean: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean;
}

class DocWrapper {
  constructor(public _d: DocumentReference<DocumentData>) {}
  get id() { return this._d.id; }
  async get() {
    const snap = await getDoc(this._d);
    return {
      exists: snap.exists(),
      id: snap.id,
      data: () => snap.data(),
    };
  }
  set(data: any) { return setDoc(this._d, sanitizeForFirestore(data)); }
  update(data: any) { return updateDoc(this._d, sanitizeForFirestore(data)); }
  delete() { return deleteDoc(this._d); }
}

class QueryWrapper {
  constructor(public _q: Query<DocumentData>) {}
  async get() {
    const snap = await getDocs(this._q);
    return {
      empty: snap.empty,
      docs: snap.docs.map(d => ({
        id: d.id,
        data: () => d.data(),
        ref: new DocWrapper(d.ref)
      })),
      size: snap.size
    };
  }
  limit(n: number) {
    return new QueryWrapper(query(this._q, limit(n)));
  }
  where(f: string, o: any, v: any) {
    // Convert operators if needed (Firebase client uses same operators as Admin)
    return new QueryWrapper(query(this._q, where(f, o, v)));
  }
}

class CollectionWrapper extends QueryWrapper {
  constructor(public _c: CollectionReference<DocumentData>) {
    super(_c);
  }
  doc(id?: string) {
    return new DocWrapper(id ? doc(this._c, id) : doc(this._c));
  }
}

export const db: any = {
  collection: (path: string) => new CollectionWrapper(collection(firestore, path)),
  batch: () => {
    const b = writeBatch(firestore);
    return {
      set: (docWrapper: DocWrapper, data: any) => b.set(docWrapper._d, sanitizeForFirestore(data)),
      update: (docWrapper: DocWrapper, data: any) => b.update(docWrapper._d, sanitizeForFirestore(data)),
      commit: () => b.commit()
    };
  },
  settings: () => {} // Shim for settings call
};

export const auth: any = {
  getUser: async () => ({ uid: 'admin' }), // Minimal shim if needed
};
