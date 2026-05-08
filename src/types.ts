export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface DocumentData {
  id: string;
  name: string;
  ownerId: string;
  content: string;
  mimeType: string;
  size: number;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  content: string;
  createdAt: string;
  createdBy: string;
}

export interface AuditLogEntry {
  id: string;
  documentId: string;
  userId: string;
  action: 'UPLOAD' | 'VIEW' | 'CHAT' | 'COMPARE' | 'DELETE' | 'VERSION_RESTORE';
  details: string;
  timestamp: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface Regulation {
  id: string;
  title: string; // Misal: UU No 11 Tahun 2020
  subject: string; // Misal: Cipta Kerja
  type: 'UU' | 'PERPU' | 'PP' | 'PERPRES' | 'PERMEN' | 'PERDA' | 'LAINNYA';
  year: number;
  tags: string[];
  description: string;
  status: 'AKTIF' | 'DICABUT' | 'DIUBAH';
  hierarchy?: string; // Misal: Turunan dari UU No 1/2024
}

export interface LegalMemo {
  title: string;
  recipient: string;
  date: string;
  subject: string;
  introduction: string; // Ringkasan fakta & tujuan
  legalAnalysis: string; // Analisis mendalam
  conclusion: string; // Kesimpulan & Rekomendasi
}

export interface AnalysisResult {
  summary: string;
  structure: string; // Ekstraksi Struktur & Semantik
  keyClauses: { 
    title: string; 
    text: string; 
    importance: string; 
    obligation?: string; // Kewajiban Hukum
  }[];
  jurisprudence: string[]; // Konteks Yurisprudensi
  risks: { 
    description: string; 
    impact: 'High' | 'Medium' | 'Low';
    mitigation: string; // Pemetaan Mitigasi
  }[];
  insights: string[];
  legalSync: string; // Sinkronisasi Database Hukum
  articleMatrix?: {
    article: string;
    content: string;
    interpretation: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
  }[];
}
