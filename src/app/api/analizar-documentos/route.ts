
import { NextResponse } from 'next/server';
import { analizarDocumentosPension } from '@/ai/flows/analizar-documentos-pension';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { documentos } = body;

    if (!documentos || !Array.isArray(documentos) || documentos.length === 0) {
      return NextResponse.json({ error: 'La lista de documentos es requerida.' }, { status: 400 });
    }

    const result = await analizarDocumentosPension({ documentos });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in API route:', error);
    return NextResponse.json(
      { error: error.message || 'Ocurrió un error inesperado en el servidor.' },
      { status: 500 }
    );
  }
}
