'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MapPin, ExternalLink } from 'lucide-react';

interface SimpleMapCardProps {
    address: string | null | undefined;
    city: string | null | undefined;
}

export function SimpleMapCard({ address, city }: SimpleMapCardProps) {
    if (!address || !city) {
        return null;
    }

    // URL simple que siempre funciona
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, ${city}, Colombia`)}`;
    
    // URL para embed - versión simplificada con Street View habilitado
    const embedUrl = `https://www.google.com/maps/embed/v1/place?key=AIzaSyAvu0J_XAdr_9N733GWP53LEr3enU8LEpQ&q=${encodeURIComponent(address + ', ' + city + ', Colombia')}&zoom=18&maptype=roadmap&language=es&region=CO`;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                    <MapPin className="h-5 w-5" /> Ubicación de Oficina ISS
                </CardTitle>
                <CardDescription>
                    Dirección: {address}, {city}
                    <br />
                    <small className="text-muted-foreground">
                        💡 Busca el icono de la persona (Pegman) para activar Street View
                    </small>
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Intentar cargar el iframe */}
                <div className="aspect-video w-full rounded-md overflow-hidden border bg-gray-100">
                    <iframe
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        src={embedUrl}
                        title={`Mapa de ${address}, ${city}`}
                        onError={(e) => {
                            console.error('Error cargando mapa:', e);
                            // Ocultar iframe en caso de error
                            (e.target as HTMLIFrameElement).style.display = 'none';
                        }}
                    />
                    <div className="p-4 text-center">
                        <p className="text-sm text-gray-600 mb-2">
                            ¿No se carga el mapa?
                        </p>
                        <button
                            onClick={() => window.open(googleMapsUrl, '_blank')}
                            className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Ver en Google Maps
                        </button>
                    </div>
                </div>
                
                {/* Información de debug */}
                <details className="text-xs text-gray-500">
                    <summary className="cursor-pointer">Información técnica</summary>
                    <div className="mt-2 p-2 bg-gray-50 rounded">
                        <p><strong>URL del mapa:</strong> {embedUrl}</p>
                        <p><strong>URL directa:</strong> {googleMapsUrl}</p>
                    </div>
                </details>
            </CardContent>
        </Card>
    );
}
