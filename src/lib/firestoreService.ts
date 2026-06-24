import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";

// ─── Types ───────────────────────────────────────────────────────────────

export interface Project {
  id?: string;
  name: string;
  shortName: string;
  refNumber: string;
  clientName: string;
  submissionDate: string;
  submissionTime: string;
  submissionAddress: string;
  budget: string;
  category: string;
  contactPersonName: string;
  contactPersonPhone: string;
  contactPersonEmail: string;
  clientRefNumber: string;
  status: "draft" | "submitted" | "awarded" | "lost";
  description: string;
  hasEnvelopes: boolean;
  starred?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ColumnDef {
  id: string;
  label: string;
  type?: 'text' | 'number';
  printHidden?: boolean;
}

export interface SheetRow {
  id: string;
  cells: Record<string, string>;
  tagColor?: string;
}

export interface Envelope {
  id?: string;
  projectId: string;
  title: string;
  sortOrder: number;
  columns: ColumnDef[];
  rows: SheetRow[];
  createdAt?: Timestamp;
}

// ─── Projects CRUD ───────────────────────────────────────────────────────

export async function createProject(
  data: Omit<Project, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, "projects"), {
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { id: "col1", label: "Reference / Appendix" },
  { id: "col2", label: "Item Description" },
  { id: "col3", label: "Note" },
];

export async function createProjectWithEnvelopes(
  projectData: Omit<Project, "id" | "createdAt" | "updatedAt">,
  envelopes: { title: string; sortOrder: number }[]
): Promise<string> {
  const now = Timestamp.now();

  const docRef = await addDoc(collection(db, "projects"), {
    ...projectData,
    createdAt: now,
    updatedAt: now,
  });

  for (const env of envelopes) {
    await addDoc(collection(db, "envelopes"), {
      projectId: docRef.id,
      title: env.title,
      sortOrder: env.sortOrder,
      columns: DEFAULT_COLUMNS,
      rows: [],
      createdAt: now,
    });
  }

  return docRef.id;
}

export async function createDefaultEnvelope(projectId: string, title: string, sortOrder: number): Promise<string> {
  const docRef = await addDoc(collection(db, "envelopes"), {
    projectId,
    title,
    sortOrder,
    columns: DEFAULT_COLUMNS,
    rows: [],
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateEnvelope(
  id: string,
  data: { columns?: ColumnDef[]; rows?: SheetRow[]; title?: string }
) {
  await updateDoc(doc(db, "envelopes", id), data);
}

export async function addRow(envelopeId: string, rows: SheetRow[]) {
  await updateDoc(doc(db, "envelopes", envelopeId), { rows });
}

export async function updateColumns(envelopeId: string, columns: ColumnDef[]) {
  await updateDoc(doc(db, "envelopes", envelopeId), { columns });
}

export async function getProjects(): Promise<Project[]> {
  const q = query(collection(db, "projects"), orderBy("updatedAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Project));
}

export async function getProject(id: string): Promise<Project | null> {
  const snap = await getDoc(doc(db, "projects", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Project;
}

export async function updateProject(
  id: string,
  data: Partial<Omit<Project, "id" | "createdAt">>
) {
  await updateDoc(doc(db, "projects", id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteProject(id: string) {
  await deleteDoc(doc(db, "projects", id));
}

export async function toggleProjectStar(id: string, starred: boolean) {
  await updateDoc(doc(db, "projects", id), {
    starred,
    updatedAt: Timestamp.now(),
  });
}

// ─── Settings ────────────────────────────────────────────────────────────

export interface AppSettings {
  fontFamily?: string;
  fontSize?: string;
  borderThickness?: string;
}

const SETTINGS_ID = "app_settings";

export async function getSettings(): Promise<AppSettings> {
  try {
    const snap = await getDoc(doc(db, "settings", SETTINGS_ID));
    if (snap.exists()) return snap.data() as AppSettings;
  } catch {}
  return {};
}

export async function updateSettings(data: AppSettings) {
  await setDoc(doc(db, "settings", SETTINGS_ID), data as any, { merge: true });
}

// ─── Envelopes CRUD ──────────────────────────────────────────────────────

export async function getEnvelopes(projectId: string): Promise<Envelope[]> {
  const q = query(collection(db, "envelopes"), orderBy("sortOrder", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as Envelope))
    .filter((e) => e.projectId === projectId);
}

export async function deleteEnvelope(id: string) {
  await deleteDoc(doc(db, "envelopes", id));
}
