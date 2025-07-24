'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Sparkles, AlertTriangle } from 'lucide-react';
import type { DajusticiaClient } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { generateLegalDocument } from '@/ai/flows/generate-legal-document';
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface GenerarPoderModalProps {
    cliente: DajusticiaClient;
    onClose: () => void;
}

const TEMPLATE_ID = "poder-general-colombia";

export function GenerarPoderModal({ cliente, onClose }: GenerarPoderModalProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [documentoHtml, setDocumentoHtml] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const generarDocumento = (plantilla: string, datos: Record<string, string>) => {
        let documento = plantilla;
        Object.keys(datos).forEach((key) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            documento = documento.replace(regex, `<strong class="text-primary">${datos[key] || 'N/A'}</strong>`);
        });
        return documento;
    };

    const fetchAndGeneratePoder = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const templateRef = doc(db, "documentTemplates", TEMPLATE_ID);
            const templateSnap = await getDoc(templateRef);
            let template = '';

            if (templateSnap.exists()) {
                template = templateSnap.data().template;
            } else {
                toast({ title: "Creando plantilla...", description: "Generando un nuevo modelo de poder con IA. Esto puede tardar un momento." });
                const result = await generateLegalDocument({
                    documentType: "Poder Amplio y Suficiente",
                    country: "Colombia",
                    specificClauses: ["Representación en procesos judiciales y administrativos", "Facultad para recibir, transigir y desistir"]
                });
                template = result.documentContent;
                await setDoc(templateRef, { template, createdAt: serverTimestamp() });
                toast({ title: "Plantilla creada", description: "El modelo de poder ha sido guardado para futuros usos." });
            }

            const datosPoder = {
                poderdanteNombre: `${cliente.nombres} ${cliente.apellidos}`,
                poderdanteCedula: cliente.cedula,
                apoderadoNombre: "Robinson Ricardo Rada González",
                apoderadoCedula: "9.082.804",
                apoderadoTarjetaProfesional: "19.429 del C.S.J"
            };

            const html = generarDocumento(template, datosPoder);
            setDocumentoHtml(html);

        } catch (err: any) {
            console.error("Error generando el poder:", err);
            setError("No se pudo generar el documento. Por favor, inténtelo de nuevo.");
            toast({ variant: 'destructive', title: "Error de IA", description: "La generación del documento falló." });
        } finally {
            setIsLoading(false);
        }
    }, [cliente, toast]);

    useEffect(() => {
        fetchAndGeneratePoder();
    }, [fetchAndGeneratePoder]);
    
    const handleGuardarPoder = async () => {
        if (!documentoHtml) {
            toast({ variant: 'destructive', title: "Error", description: "No hay documento que guardar." });
            return;
        }
        setIsSaving(true);
        try {
            const documentosCollectionRef = collection(db, "nuevosclientes", cliente.id, "documentos");
            await addDoc(documentosCollectionRef, {
                tipo: 'Poder Amplio y Suficiente',
                contenidoHtml: documentoHtml,
                datosCliente: cliente,
                creadoEn: serverTimestamp()
            });
            toast({ title: "Éxito", description: "Poder guardado en la subcolección 'documentos' del cliente." });
            onClose();
        } catch (error: any) {
            console.error("Error guardando el poder:", error);
            toast({ variant: 'destructive', title: "Error", description: `No se pudo guardar el poder: ${error.message}` });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Generar Poder</DialogTitle>
                    <DialogDescription>
                        Documento generado por IA para {cliente.nombres} {cliente.apellidos}.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-6 border rounded-md prose prose-sm max-w-none">
                    {isLoading && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Generando documento...</div>}
                    {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4"/><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
                    {documentoHtml && <div dangerouslySetInnerHTML={{ __html: documentoHtml.replace(/\n/g, '<br/>') }} />}
                </div>
                <DialogFooter className="gap-2">
                     <Button variant="outline" onClick={onClose}>Cerrar</Button>
                    <Button onClick={handleGuardarPoder} disabled={isSaving || isLoading || !!error}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Guardar Poder en Firebase
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
