

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
  ano_jubilacion?: string; // Add this optional field
  fechaPensionado?: string; // Optional field for retirement date
  analisisIA?: string;
  analisisFecha?: Timestamp;
}

export interface PaymentDetail {
  codigo: string | null;
  nombre: string;
  ingresos: number;
  egresos: number;
}

export interface Payment {
  id:string;
  año: string;
  periodoPago: string;
  fechaLiquidacion?: string;
  fechaProcesado?: string; // Can be a string from older data
  detalles: PaymentDetail[];
}

// New type for Procesos Cancelados
export interface ProcesoCanceladoConcepto {
    codigo: string;
    egresos: number;
    ingresos: number;
    nombre: string;
}

export interface ProcesoCancelado {
    id: string;
    año: string;
    conceptos: ProcesoCanceladoConcepto[];
    creadoEn: string; 
    fechaLiquidacion: string;
    pagoId: string;
    pensionadoId: string;
    periodoPago: string;
    pensionerInfo?: {
        name: string;
        document: string;
        department: string;
    };
    pagoOriginal?: Payment | null;
}

// Types for Gestion de Demandas
export interface Anotacion {
    id?: string; // Document ID from Firebase
    auto: string;
    num_registro: string;
    fecha: string;
    fecha_limite: string;
    fecha_limite_ordenable: string; // YYYY-MM-DD for querying
    hora_limite: string;
    detalle: string;
    clase: string;
    nombre_documento: string | null;
    archivo_url: string | null;
    resumen?: string;
    notification24hSent?: boolean;
    notificationTodaySent?: boolean;
    ubicacion?: string;
}

// Type for general tasks
export interface Tarea {
    id?: string;
    detalle: string;
    fecha_limite: string;
    fecha_limite_ordenable: string; // YYYY-MM-DD for sorting
    hora_limite: string;
    ubicacion?: string; // URL for Meet, Zoom, etc.
    creadoEn: Timestamp;
    type: 'GENERAL'; // To distinguish from process annotations
    resumen?: string;
    notification24hSent?: boolean;
    notificationTodaySent?: boolean;
}

// Types for Provired Notifications
export interface ProviredNotification {
  id: string;
  descripcion: string;
  fechaPublicacion: string;
  proceso: string;
  radicacion: string;
  demandante: string;
  demandante_lower: string;
  demandado_lower: string;
  rutaAuto: string;
}


// Types for Pensioner Profile Page
export interface Parris1 {
  id: string;
  fe_adquiere: string; 
  fe_causa: string; 
  fe_ingreso: string; 
  fe_nacido: string;
  fe_vinculado: string;
  semanas: number;
  res_nro: string;
  res_ano: number;
  mesada: number;
  ciudad_iss: string;
  dir_iss: string;
  telefono_iss: number;
  regimen: number;
  riesgo: string;
  seguro: number;
  tranci: boolean;
}

export interface PagosHistoricoRecord {
  ANO_RET?: number;
  CEDULA?: number;
  TIPO_AUM?: string;
  PORCENTAJE?: string;
  VALOR_ACT?: string;
  VALOR_ANT?: string;
}

export interface CausanteRecord {
  cedula_beneficiario?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  observacion?: string;
  tipo_aum?: string;
  valor_empresa?: number;
  valor_iss?: number;
}

export interface Causante {
  id: string;
  cedula_causante: string;
  records: CausanteRecord[];
}

export interface LegalProcess {
    id: string;
    num_radicado_ini: string;
    clase_proceso: string;
    estado: string;
}

export interface DajusticiaClient {
  id: string;
  apellidos: string;
  cedula: string;
  celular: string;
  correo: string;
  cuotaMensual: string;
  direccion: string;
  grupo: string;
  multiplicadorSalario: number;
  nombres: string;
  plazoMeses: string;
  salario: number;
  telefonoFijo: string;
  archivos: { [key: string]: string };
  estado?: 'activo' | 'inactivo';
}

export interface DajusticiaPayment {
  id: string;
  descuento: number;
  empresa: number;
  fecha: string;
  monto: number;
  montoNeto: number;
  soporteURL: string;
  vendedor: number;
}

export interface PensionerProfileData {
    payments: Payment[];
    legalProcesses: LegalProcess[];
    parris1Data: Parris1 | null;
    causanteData: Causante | null;
    historicalPayment: PagosHistoricoRecord | null;
    historicalPayments: PagosHistoricoRecord[]; // Add this
    dajusticiaClientData: DajusticiaClient | null;
    dajusticiaPayments: DajusticiaPayment[];
    lastNotification: ProviredNotification | null;
}
