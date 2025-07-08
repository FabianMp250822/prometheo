export type PaymentStatus = "Analizado" | "Pendiente" | "Pagado";
export type LegalConcept = "Costas Procesales" | "Retro Mesada Adicional" | "Procesos y Sentencia Judiciales";

export interface Sentence {
  id: string;
  description: string;
  date: string;
  amount: number;
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
  fiscalYear: number;
  uploadDate: string;
  paymentPeriod: {
    start: string;
    end: string;
  };
  status: PaymentStatus;
  concepts: {
    "Costas Procesales"?: number;
    "Retro Mesada Adicional"?: number;
    "Procesos y Sentencia Judiciales"?: number;
  };
  totalAmount: number;
  sentences: Sentence[];
  paymentHistory: PaymentRecord[];
}

export const payments: UserPayment[] = [
  {
    id: 'usr_001',
    user: { name: 'Juan Pérez', document: '12345678A', avatarUrl: 'https://placehold.co/40x40.png' },
    department: 'Dependencia A',
    fiscalYear: 2023,
    uploadDate: '2023-10-15',
    paymentPeriod: { start: '2023-01-01', end: '2023-12-31' },
    status: 'Analizado',
    concepts: {
      "Costas Procesales": 1500,
      "Retro Mesada Adicional": 3000,
    },
    totalAmount: 4500,
    sentences: [{ id: 'sent_001', description: 'Sentencia por daños y perjuicios', date: '2022-05-20', amount: 4500 }],
    paymentHistory: [{ id: 'pay_001', period: '2023-01', amount: 375, documentRef: 'doc_001' }],
  },
  {
    id: 'usr_002',
    user: { name: 'Maria García', document: '87654321B', avatarUrl: 'https://placehold.co/40x40.png' },
    department: 'Dependencia B',
    fiscalYear: 2024,
    uploadDate: '2024-02-20',
    paymentPeriod: { start: '2024-01-01', end: '2024-06-30' },
    status: 'Pendiente',
    concepts: {
      "Procesos y Sentencia Judiciales": 5000,
    },
    totalAmount: 5000,
    sentences: [{ id: 'sent_002', description: 'Sentencia laboral', date: '2023-11-10', amount: 5000 }],
    paymentHistory: [],
  },
  {
    id: 'usr_003',
    user: { name: 'Carlos Rodríguez', document: '11223344C', avatarUrl: 'https://placehold.co/40x40.png' },
    department: 'Dependencia A',
    fiscalYear: 2023,
    uploadDate: '2023-11-01',
    paymentPeriod: { start: '2023-06-01', end: '2023-12-31' },
    status: 'Pagado',
    concepts: {
      "Costas Procesales": 500,
      "Procesos y Sentencia Judiciales": 2500,
    },
    totalAmount: 3000,
    sentences: [{ id: 'sent_003', description: 'Acuerdo de pago', date: '2023-04-15', amount: 3000 }],
    paymentHistory: [
        { id: 'pay_002a', period: '2023-07', amount: 1500, documentRef: 'doc_002' },
        { id: 'pay_002b', period: '2023-08', amount: 1500, documentRef: 'doc_003' }
    ],
  },
  {
    id: 'usr_004',
    user: { name: 'Ana Martínez', document: '44556677D', avatarUrl: 'https://placehold.co/40x40.png' },
    department: 'Dependencia C',
    fiscalYear: 2024,
    uploadDate: '2024-03-01',
    paymentPeriod: { start: '2022-01-01', end: '2022-12-31' },
    status: 'Analizado',
    concepts: {
      "Retro Mesada Adicional": 12000,
    },
    totalAmount: 12000,
    sentences: [{ id: 'sent_004', description: 'Reajuste de pensión', date: '2021-10-01', amount: 12000 }],
    paymentHistory: [{ id: 'pay_003', period: '2024-03', amount: 1000, documentRef: 'doc_004' }],
  },
  {
    id: 'usr_005',
    user: { name: 'Lucía Fernández', document: '99887766E', avatarUrl: 'https://placehold.co/40x40.png' },
    department: 'Dependencia B',
    fiscalYear: 2024,
    uploadDate: '2024-01-10',
    paymentPeriod: { start: '2023-01-01', end: '2023-12-31' },
    status: 'Pendiente',
    concepts: {
      "Costas Procesales": 800,
      "Retro Mesada Adicional": 1500,
      "Procesos y Sentencia Judiciales": 4000,
    },
    totalAmount: 6300,
    sentences: [
        { id: 'sent_005a', description: 'Sentencia principal', date: '2022-08-01', amount: 5500 },
        { id: 'sent_005b', description: 'Costas del proceso', date: '2022-09-01', amount: 800 }
    ],
    paymentHistory: [],
  }
];

export const dependencies = [...new Set(payments.map(p => p.department))];
export const fiscalYears = [...new Set(payments.map(p => p.fiscalYear))];
export const legalConcepts: LegalConcept[] = ["Costas Procesales", "Retro Mesada Adicional", "Procesos y Sentencia Judiciales"];
export const statuses: PaymentStatus[] = ["Analizado", "Pendiente", "Pagado"];
