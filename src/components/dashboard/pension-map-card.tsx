
'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MapPin, ExternalLink } from 'lucide-react';

interface PensionMapCardProps {
    address: string | null | undefined;
    city: string | null | undefined;
}

export function PensionMapCard({ address, city }: PensionMapCardProps) {
    const googleMapsUrl = useMemo(() => {
        if (!address || !city) return null;
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, ${city}, Colombia`)}`;
    }, [address, city]);

    const embedUrl = useMemo(() => {
        if (!address || !city) return null;
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            console.error("Google Maps API key is not defined.");
            return null;
        }
        const query = encodeURIComponent(`${address}, ${city}, Colombia`);
        // The key change is here: using the `q` parameter for location query instead of `center`.
        return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${query}&zoom=18`;
    }, [address, city]);

    if (!address || !city) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <MapPin className="h-5 w-5" /> Ubicación de Oficina ISS
                    </CardTitle>
                    <CardDescription>
                        No hay información de dirección disponible para mostrar en el mapa.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (!embedUrl) {
         return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <MapPin className="h-5 w-5" /> Ubicación de Oficina ISS
                    </CardTitle>
                    <CardDescription>
                       No se pudo construir la URL del mapa. Verifique la configuración de la API Key.
                    </CardDescription>
                </CardHeader>
                 <CardContent>
                    {googleMapsUrl && (
                        <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                            Ver en Google Maps
                        </a>
                    )}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                    <MapPin className="h-5 w-5" /> Ubicación de Oficina ISS
                </CardTitle>
                <CardDescription>
                    Dirección: {address}, {city}.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="aspect-video w-full rounded-md overflow-hidden border bg-muted">
                    <iframe
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        src={embedUrl}
                        title={`Mapa de ${address}, ${city}`}
                    />
                </div>
                 <div className="mt-2 text-xs text-center">
                    <a href={googleMapsUrl!} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary flex items-center justify-center gap-1">
                       <ExternalLink className="h-3 w-3" />
                       Abrir en una nueva pestaña
                    </a>
                </div>
            </CardContent>
        </Card>
    );
}
