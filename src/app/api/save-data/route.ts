'use server';

import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized: No token provided' }, { status: 401 });
    }
    
    const idToken = authorization.split('Bearer ')[1];
    await adminAuth.verifyIdToken(idToken);

    const data = await request.json();
    if (!data || !data.procesos) {
        return NextResponse.json({ success: false, error: 'No data provided to save.' }, { status: 400 });
    }

    const { procesos, demandantes, anotaciones, anexos } = data;
    const BATCH_SIZE = 400;

    for (let i = 0; i < procesos.length; i += BATCH_SIZE) {
        const batch = adminDb.batch();
        const chunk = procesos.slice(i, i + BATCH_SIZE);

        for (const proceso of chunk) {
            if (!proceso.num_registro) continue;
            const procesoDocRef = adminDb.collection("procesos").doc(proceso.num_registro);
            batch.set(procesoDocRef, Object.fromEntries(Object.entries(proceso).filter(([, value]) => value != null)));
            
            const subCollections = {
                demandantes: demandantes[proceso.num_registro],
                anotaciones: anotaciones[proceso.num_registro],
                anexos: anexos[proceso.num_registro],
            };

            for (const [key, items] of Object.entries(subCollections)) {
                if (items && Array.isArray(items) && items.length > 0) {
                    items.forEach((item: any) => {
                        const itemId = item.auto || item.id_anexo || item.identidad_demandante || `${Date.now()}`;
                        if (itemId) {
                            const itemDocRef = procesoDocRef.collection(key).doc(itemId.toString());
                            batch.set(itemDocRef, Object.fromEntries(Object.entries(item).filter(([, value]) => value != null)));
                        }
                    });
                }
            }
        }
        await batch.commit();
    }

    return NextResponse.json({ success: true, message: `${procesos.length} procesos guardados.` });

  } catch (error: any) {
    console.error('API Error:', error);
    if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
      return NextResponse.json({ success: false, error: 'Unauthorized: Invalid token' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
