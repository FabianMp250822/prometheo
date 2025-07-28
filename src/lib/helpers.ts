
import { Sentence } from "./data";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';


export const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number') return '$0';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
};

const monthMap: { [key: string]: number } = {
    'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5, 
    'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11,
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
    'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
};

export const parsePeriodoPago = (periodoPago: string): { startDate: Date | null, endDate: Date | null } => {
    if (!periodoPago || typeof periodoPago !== 'string') {
        return { startDate: null, endDate: null };
    }
    
    try {
        const cleanedPeriodo = periodoPago.toLowerCase().replace(/\./g, '');
        const parts = cleanedPeriodo.split(' a ');
        if (parts.length !== 2) return { startDate: null, endDate: null };

        const parseDate = (dateStr: string): Date | null => {
            const dateParts = dateStr.trim().split(' ');
            if (dateParts.length !== 3) return null;
            const [day, monthStr, year] = dateParts;
            const month = monthMap[monthStr];
            if (month === undefined) return null;
            return new Date(parseInt(year), month, parseInt(day));
        }

        const startDate = parseDate(parts[0]);
        const endDate = parseDate(parts[1]);

        return { startDate, endDate };
    } catch (error) {
        console.error("Error parsing period:", periodoPago, error);
        return { startDate: null, endDate: null };
    }
};

export const getLatestPeriod = (sentencias: Sentence[]): string => {
    if (!sentencias || sentencias.length === 0) return "N/A";
    
    const sorted = [...sentencias].sort((a, b) => {
        const dateA = parsePeriodoPago(a.paymentPeriod)?.endDate || new Date(0);
        const dateB = parsePeriodoPago(b.paymentPeriod)?.endDate || new Date(0);
        return dateB.getTime() - dateA.getTime();
    });

    return sorted[0].paymentPeriod;
};

export const getLatestYear = (sentencias: Sentence[]): number => {
    if (!sentencias || sentencias.length === 0) return 0;
    
    const latestPeriod = getLatestPeriod(sentencias);
    const { endDate } = parsePeriodoPago(latestPeriod);
    
    return endDate ? endDate.getFullYear() : 0;
}

export const parseEmployeeName = (fullName: string): string => {
    if (!fullName) return 'N/A';
    
    // Split by the " (C.C." part to isolate the name
    const namePart = fullName.split(' (C.C.')[0].trim();
    if (namePart) return namePart;
    
    return fullName; // Fallback to the original string
};


export const parsePaymentDetailName = (detailName: string): string => {
  if (!detailName) return '';
  // Removes numeric prefixes like "1001-"
  const parts = detailName.split('-');
  if (parts.length > 1 && /^\d+$/.test(parts[0])) {
    return parts.slice(1).join('-').trim();
  }
  return detailName;
};

export const parseDepartmentName = (departmentName: string): string => {
  if (!departmentName) return 'N/A';
  // Removes prefixes like "V1-" and specific suffixes like " PENSIONADOS"
  return departmentName
    .replace(/^V\d+-/, '')
    .replace(/ PENSIONADOS$/, '')
    .trim();
};

export const formatPeriodoToMonthYear = (periodoPago: string): string => {
    if (!periodoPago) return 'N/A';

    const fullMonthMap: { [key: string]: string } = {
        'ene': 'Enero', 'feb': 'Febrero', 'mar': 'Marzo', 'abr': 'Abril', 
        'may': 'Mayo', 'jun': 'Junio', 'jul': 'Julio', 'ago': 'Agosto', 
        'sep': 'Septiembre', 'oct': 'Octubre', 'nov': 'Noviembre', 'dic': 'Diciembre'
    };
    
    const cleanedPeriodo = periodoPago.toLowerCase().replace(/\./g, '');
    const parts = cleanedPeriodo.split(' a ');

    // Try to match "mes año" format first
    const monthYearMatch = cleanedPeriodo.match(/(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\s(\d{4})/);
    if (monthYearMatch) {
      const monthStr = monthYearMatch[1];
      const year = monthYearMatch[2];
      return `${fullMonthMap[monthStr] || monthStr} ${year}`;
    }

    // Fallback to parsing start date of period
    if (parts.length > 0) {
        const dateParts = parts[0].trim().split(' ');
        if (dateParts.length === 3) {
            const [, monthStr, year] = dateParts;
            const month = fullMonthMap[monthStr as keyof typeof fullMonthMap];
            if (month) {
                return `${month} ${year}`;
            }
        }
    }

    return periodoPago; // Return original if format is unexpected
};

export const formatFirebaseTimestamp = (timestamp: any, dateFormat = 'd MMMM yyyy'): string => {
  if (!timestamp) {
    return 'N/A';
  }
  
  try {
    let date: Date;
    // It could be a Firestore Timestamp object with toDate() method
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } 
    // It could be an ISO string
    else if (typeof timestamp === 'string') {
      date = parseISO(timestamp);
    } 
    // It could be a regular Date object
    else if (timestamp instanceof Date) {
      date = timestamp;
    } 
    else {
      return 'Fecha inválida';
    }

    if (isNaN(date.getTime())) return 'Fecha inválida';
    return format(date, dateFormat, { locale: es });
  } catch (error) {
    console.error("Error formatting timestamp:", error);
    return 'Fecha inválida';
  }
};
