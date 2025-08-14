
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, ExternalLink } from 'lucide-react';

interface PensionMapFallbackProps {
    address: string;
    city: string;
}

export function PensionMapFallback({ address, city }: PensionMapFallbackProps) {
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, ${city}, Colombia`)}`;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                    <MapPin className="h-5 w-5" /> Ubicación de Oficina ISS
                </CardTitle>
                <CardDescription>
                    Dirección: {address}, {city}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        No se pudo cargar el mapa integrado. Es posible que la dirección no sea válida o que haya un problema de configuración.
                    </p>
                    <Button 
                        onClick={() => window.open(googleMapsUrl, '_blank')} 
                        className="w-full"
                        variant="outline"
                    >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Intentar abrir en Google Maps
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
