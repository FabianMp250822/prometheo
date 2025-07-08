import type { Timestamp } from 'firebase/firestore';

export type PaymentStatus = "Analizado" | "Pendiente" | "Pagado";
export type LegalConcept = "Costas Procesales" | "Retro Mesada Adicional" | "Procesos y Sentencia Judiciales";

export interface Sentence {
  id: string;
  description: string;
  date: string; // "YYYY-MM-DD"
  amount: number;
  paymentPeriod: string; // "1 ene. 2023 a 31 dic. 2023"
}

export interface PaymentRecord {
  id: string;
  period: string;
  amount: number;
  documentRef: string;
}

export interface UserPayment {
  id: string;
  user: {
    name: string;
    document: string;
    avatarUrl: string;
  };
  department: string;
  uploadDate: string; // Consider converting to Timestamp on write
  status: PaymentStatus; // Legacy status, prefer `analyzedAt`
  analyzedAt: Timestamp | string | null; // Can be string, null, or Firestore Timestamp
  concepts: {
    "Costas Procesales"?: number;
    "Retro Mesada Adicional"?: number;
    "Procesos y Sentencia Judiciales"?: number;
  };
  totalAmount: number;
  sentences: Sentence[];
  paymentHistory: PaymentRecord[];
}


export const dependencies: string[] = ["Dependencia A", "Dependencia B", "Dependencia C"];
export const legalConcepts: LegalConcept[] = ["Costas Procesales", "Retro Mesada Adicional", "Procesos y Sentencia Judiciales"];
export const statuses: PaymentStatus[] = ["Analizado", "Pendiente", "Pagado"];


// New types for Pagos section
export interface Pensioner {
  id: string; // document id which is the same as documento
  documento: string;
  empleado: string;
  dependencia1: string;
  centroCosto: string;
}

export interface PaymentDetail {
  codigo: string | null;
  nombre: string;
  ingresos: number;
  egresos: number;
}

export interface Payment {
  id: string;
  año: string;
  periodoPago: string;
  fechaProcesado: Timestamp;
  detalles: PaymentDetail[];
}
