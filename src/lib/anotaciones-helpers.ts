'use client';

export const corregirTexto = (texto: string): string => {
    if (!texto) return '';
    // This seems to be correcting double-UTF8 encoding issues.
    return texto
      .replace(/Ã³/g, 'ó')
      .replace(/Ã±/g, 'ñ')
      .replace(/Ã¡/g, 'á')
      .replace(/Ã©/g, 'é')
      .replace(/Ã­/g, 'í')
      .replace(/Ãº/g, 'ú')
      .replace(/Â/g, '') // Often a stray character in these encoding issues
      .replace(/í¡/g, 'á')
      .replace(/í©/g, 'é')
      .replace(/í­/g, 'í')
      .replace(/í³/g, 'ó')
      .replace(/íº/g, 'ú');
};

export const transformarFecha = (fecha: string): string => {
    if (!fecha) return '';
    const fechaLimpia = fecha.trim();
    if (fechaLimpia === '00-00-0000' || fechaLimpia === '00/00/0000') return '';

    // Reemplazar barras con guiones
    const partes = fechaLimpia.replace(/\//g, '-').split('-'); 
    
    if (partes.length === 3) {
      let [dia, mes, anio] = partes;
      
      // Corregir año malformado como "20025" -> "2025"
      if (anio.length > 4 && anio.startsWith('200')) {
          anio = '20' + anio.substring(3);
      } else if (anio.length > 4) {
          anio = anio.substring(0, 4);
      }
      
      // Corregir años extraños como "0017"
      if (anio.length === 4 && parseInt(anio) < 1900) {
         anio = `20${anio.slice(-2)}`;
      }
      
      return `${dia.padStart(2, '0')}-${mes.padStart(2, '0')}-${anio}`;
    }
    return fecha; // Devolver como está si el formato es inesperado
};

export const convertirAFormatoOrdenable = (fecha: string): string => {
    if (!fecha) return '9999-12-31'; // Put items with no date at the end
    const partes = fecha.split('-');
    if (partes.length === 3) {
      const [dia, mes, anio] = partes;
      // Ensure year is valid before creating the sortable string
      if (anio && mes && dia && anio.length === 4) {
        return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
      }
    }
    return '9999-12-31'; // Invalid format, put at the end
};

export const convertirHoraLimite = (hora: string): string => {
    if (!hora) return '00:00';
    
    const [time, modifier] = hora.toLowerCase().split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes)) return '00:00';

    if (modifier === 'pm' && hours < 12) {
      hours += 12;
    }
    if (modifier === 'am' && hours === 12) {
      hours = 0; // Midnight case
    }
    
    return `${hours.toString().padStart(2, '0')}:${(minutes || 0).toString().padStart(2, '0')}`;
  };

export const anadirPrefijoRuta = (ruta: string): string | null => {
    if (!ruta) return null;
    const baseUrl = 'https://appdajusticia.com/private/';
    
    if (ruta.startsWith(baseUrl)) {
      return ruta;
    }
  
    // Remove potential leading slashes and ensure correct path joining
    const cleanRuta = ruta.startsWith('/') ? ruta.substring(1) : ruta;
    return `${baseUrl}${cleanRuta}`; 
};
