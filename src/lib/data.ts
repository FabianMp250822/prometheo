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
  uploadDate: string;
  status: PaymentStatus; // Legacy status, prefer `analyzedAt`
  analyzedAt: string | null; // ISO Date string, null if pending
  concepts: {
    "Costas Procesales"?: number;
    "Retro Mesada Adicional"?: number;
    "Procesos y Sentencia Judiciales"?: number;
  };
  totalAmount: number;
  sentences: Sentence[];
  paymentHistory: PaymentRecord[];
}

// fiscalYear and paymentPeriod have been moved into individual sentences
export const payments: UserPayment[] = [
  {
    id: 'usr_001',
    user: { name: 'Juan Pérez', document: '12345678A', avatarUrl: 'https://placehold.co/40x40.png' },
    department: 'Dependencia A',
    uploadDate: '2023-10-15',
    status: 'Analizado',
    analyzedAt: '2023-10-16T10:00:00Z',
    concepts: { "Costas Procesales": 1500, "Retro Mesada Adicional": 3000 },
    totalAmount: 4500,
    sentences: [{ id: 'sent_001', description: 'Sentencia por daños y perjuicios', date: '2022-05-20', amount: 4500, paymentPeriod: '1 ene. 2023 a 31 dic. 2023' }],
    paymentHistory: [{ id: 'pay_001', period: '2023-01', amount: 375, documentRef: 'doc_001' }],
  },
  {
    id: 'usr_002',
    user: { name: 'Maria García', document: '87654321B', avatarUrl: 'https://placehold.co/40x40.png' },
    department: 'Dependencia B',
    uploadDate: '2024-02-20',
    status: 'Pendiente',
    analyzedAt: null,
    concepts: { "Procesos y Sentencia Judiciales": 5000 },
    totalAmount: 5000,
    sentences: [{ id: 'sent_002', description: 'Sentencia laboral', date: '2023-11-10', amount: 5000, paymentPeriod: '1 ene. 2024 a 30 jun. 2024' }],
    paymentHistory: [],
  },
  {
    id: 'usr_003',
    user: { name: 'Carlos Rodríguez', document: '11223344C', avatarUrl: 'https://placehold.co/40x40.png' },
    department: 'Dependencia A',
    uploadDate: '2023-11-01',
    status: 'Pagado',
    analyzedAt: '2023-11-02T11:00:00Z',
    concepts: { "Costas Procesales": 500, "Procesos y Sentencia Judiciales": 2500 },
    totalAmount: 3000,
    sentences: [{ id: 'sent_003', description: 'Acuerdo de pago', date: '2023-04-15', amount: 3000, paymentPeriod: '1 jun. 2023 a 31 dic. 2023' }],
    paymentHistory: [
        { id: 'pay_002a', period: '2023-07', amount: 1500, documentRef: 'doc_002' },
        { id: 'pay_002b', period: '2023-08', amount: 1500, documentRef: 'doc_003' }
    ],
  },
  {
    id: 'usr_004',
    user: { name: 'Ana Martínez', document: '44556677D', avatarUrl: 'https://placehold.co/40x40.png' },
    department: 'Dependencia C',
    uploadDate: '2024-03-01',
    status: 'Analizado',
    analyzedAt: '2024-03-02T12:00:00Z',
    concepts: { "Retro Mesada Adicional": 12000 },
    totalAmount: 12000,
    sentences: [{ id: 'sent_004', description: 'Reajuste de pensión', date: '2021-10-01', amount: 12000, paymentPeriod: '1 ene. 2022 a 31 dic. 2022' }],
    paymentHistory: [{ id: 'pay_003', period: '2024-03', amount: 1000, documentRef: 'doc_004' }],
  },
  {
    id: 'usr_005',
    user: { name: 'Lucía Fernández', document: '99887766E', avatarUrl: 'https://placehold.co/40x40.png' },
    department: 'Dependencia B',
    uploadDate: '2024-01-10',
    status: 'Pendiente',
    analyzedAt: null,
    concepts: { "Costas Procesales": 800, "Retro Mesada Adicional": 1500, "Procesos y Sentencia Judiciales": 4000 },
    totalAmount: 6300,
    sentences: [
        { id: 'sent_005a', description: 'Sentencia principal', date: '2022-08-01', amount: 5500, paymentPeriod: '1 ene. 2023 a 31 dic. 2023' },
        { id: 'sent_005b', description: 'Costas del proceso', date: '2022-09-01', amount: 800, paymentPeriod: '1 ene. 2023 a 31 dic. 2023' }
    ],
    paymentHistory: [],
  }
];

export const dependencies = [...new Set(payments.map(p => p.department))];
export const legalConcepts: LegalConcept[] = ["Costas Procesales", "Retro Mesada Adicional", "Procesos y Sentencia Judiciales"];
export const statuses: PaymentStatus[] = ["Analizado", "Pendiente", "Pagado"];
