
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, ExternalLink, Eye, Navigation } from 'lucide-react';

interface PensionMapFallbackProps {
    address: string;
    city: string;
}

export function PensionMapFallback({ address, city }: PensionMapFallbackProps) {
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, ${city}, Colombia`)}`;
    
    const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${encodeURIComponent(`${address}, ${city}, Colombia`)}`;
    
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${address}, ${city}, Colombia`)}`;

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
                        El mapa integrado no está disponible. Usa las siguientes opciones para ver la ubicación:
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Button 
                            onClick={() => window.open(streetViewUrl, '_blank')} 
                            className="flex items-center gap-2"
                            variant="default"
                        >
                            <Eye className="h-4 w-4" />
                            Street View
                        </Button>
                        
                        <Button 
                            onClick={() => window.open(directionsUrl, '_blank')} 
                            className="flex items-center gap-2"
                            variant="outline"
                        >
                            <Navigation className="h-4 w-4" />
                            Direcciones
                        </Button>
                        
                        <Button 
                            onClick={() => window.open(googleMapsUrl, '_blank')} 
                            className="flex items-center gap-2"
                            variant="outline"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Google Maps
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
