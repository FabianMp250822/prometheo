

'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MapPin, ExternalLink, Eye, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PensionMapFallback } from './pension-map-fallback';

interface PensionMapCardProps {
    address: string | null | undefined;
    city: string | null | undefined;
}

export function PensionMapCard({ address, city }: PensionMapCardProps) {
    const googleMapsUrl = useMemo(() => {
        if (!address || !city) return null;
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, ${city}, Colombia`)}`;
    }, [address, city]);

    const streetViewUrl = useMemo(() => {
        if (!address || !city) return null;
        const query = encodeURIComponent(`${address}, ${city}, Colombia`);
        return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${query}`;
    }, [address, city]);

    const directionsUrl = useMemo(() => {
        if (!address || !city) return null;
        const destination = encodeURIComponent(`${address}, ${city}, Colombia`);
        return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    }, [address, city]);

    const embedUrl = useMemo(() => {
        if (!address || !city) return null;
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            console.error("Google Maps API key is not defined.");
            return null;
        }
        const query = encodeURIComponent(`${address}, ${city}, Colombia`);
        // Use 'place' mode with specific parameters to enable all controls including Street View
        return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${query}&zoom=18&maptype=roadmap&language=es&region=CO`;
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
      return <PensionMapFallback address={address} city={city} />;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                    <MapPin className="h-5 w-5" /> Ubicación de Oficina ISS
                </CardTitle>
                <CardDescription>
                    Dirección: {address}, {city}. 
                    <br />
                    <small className="text-muted-foreground">
                        �️ Usa los botones debajo para ver Street View y obtener direcciones
                    </small>
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
                        allow="geolocation; camera; microphone"
                        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                    />
                </div>
                
                {/* Botones de acción para Street View y direcciones */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(streetViewUrl!, '_blank')}
                        className="flex items-center gap-2"
                    >
                        <Eye className="h-4 w-4" />
                        Street View
                    </Button>
                    
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(directionsUrl!, '_blank')}
                        className="flex items-center gap-2"
                    >
                        <Navigation className="h-4 w-4" />
                        Direcciones
                    </Button>
                    
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(googleMapsUrl!, '_blank')}
                        className="flex items-center gap-2"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Google Maps
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
