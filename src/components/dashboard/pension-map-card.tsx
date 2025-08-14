
'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import { PensionMapFallback } from './pension-map-fallback';


interface PensionMapCardProps {
    address: string | null | undefined;
    city: string | null | undefined;
}

export function PensionMapCard({ address, city }: PensionMapCardProps) {
    const mapSrc = useMemo(() => {
        if (!address || !city) {
            return null;
        }
        
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            console.error("Google Maps API key is not defined.");
            return null;
        }
        
        const fullAddress = `${address}, ${city}, Colombia`;
        // Ensure the address is properly encoded for a URL
        const query = encodeURIComponent(fullAddress);
        if(!query) return null;

        return `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${query}&zoom=18&maptype=roadmap`;

    }, [address, city]);
    
    // If the address or city is missing, show a clear message.
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
    
    // If the map URL could not be constructed, show the fallback.
    if (!mapSrc) {
        return <PensionMapFallback address={address} city={city} />;
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
