
'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

interface PensionMapCardProps {
    address: string | null | undefined;
    city: string | null | undefined;
}

export function PensionMapCard({ address, city }: PensionMapCardProps) {
    const mapSrc = useMemo(() => {
        if (!address || !city) {
            return null;
        }
        
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyAvu0J_XAdr_9N733GWP53LEr3enU8LEpQ';
        if (!apiKey) {
            console.error("Google Maps API key is missing.");
            return null;
        }
        
        const query = encodeURIComponent(`${address}, ${city}, Colombia`);
        
        // This URL uses the standard Google Maps view, which includes the Street View Pegman control.
        return `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${query}&zoom=18&maptype=roadmap`;

    }, [address, city]);

    if (!address || !city) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <MapPin className="h-5 w-5" /> Ubicación de Oficina ISS
                    </CardTitle>
                    <CardDescription>
                        No hay información de dirección disponible.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (!mapSrc) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <MapPin className="h-5 w-5" /> Ubicación de Oficina ISS
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive">Clave de API de Google Maps no configurada.</p>
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
                    Mapa interactivo mostrando la dirección: {address}, {city}.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="aspect-video w-full rounded-md overflow-hidden border bg-gray-100">
                    <iframe
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        src={mapSrc}
                        title={`Mapa de ${address}, ${city}`}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
