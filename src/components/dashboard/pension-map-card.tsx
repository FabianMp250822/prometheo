
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
        const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
        if (!apiKey) {
            console.error("Google Maps API key is missing.");
            return null;
        }
        const query = encodeURIComponent(`${address}, ${city}, Colombia`);
        return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${query}`;
    }, [address, city]);

    if (!mapSrc) {
        return null;
    }

    return (
        <React.Fragment key="map-card">
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
                    <div className="aspect-video w-full rounded-md overflow-hidden border">
                        <iframe
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            loading="lazy"
                            allowFullScreen
                            referrerPolicy="no-referrer-when-downgrade"
                            src={mapSrc}>
                        </iframe>
                    </div>
                </CardContent>
            </Card>
        </React.Fragment>
    );
}
