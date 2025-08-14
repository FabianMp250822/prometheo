
'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, AlertCircle } from 'lucide-react';

interface PensionMapCardProps {
    address: string | null | undefined;
    city: string | null | undefined;
}

export function PensionMapCard({ address, city }: PensionMapCardProps) {
    const [mapError, setMapError] = useState<string | null>(null);

    const mapSrc = useMemo(() => {
        if (!address || !city) {
            return null;
        }
        
        // Usar la variable de entorno o la clave hardcodeada como fallback
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyAvu0J_XAdr_9N733GWP53LEr3enU8LEpQ';
        
        if (!apiKey) {
            console.error("Google Maps API key is missing.");
            setMapError("Clave de API de Google Maps no configurada");
            return null;
        }
        
        // Limpiar y formatear la dirección
        const cleanAddress = address.trim();
        const cleanCity = city.trim();
        const query = encodeURIComponent(`${cleanAddress}, ${cleanCity}, Colombia`);
        
        // URL con parámetros adicionales para mejor compatibilidad
        const url = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${query}&zoom=18&maptype=roadmap&language=es&region=CO`;
        
        console.log('API Key utilizada:', apiKey);
        console.log('Referer actual:', window.location.href);
        console.log('Puerto actual:', window.location.port);
        console.log('Dirección original:', address);
        console.log('Ciudad original:', city);
        console.log('Query codificado:', query);
        console.log('URL completa del mapa:', url);
        
        return url;
    }, [address, city]);

    const handleIframeError = (event: any) => {
        console.error('Error cargando iframe del mapa:', event);
        setMapError("Error de autorización: La API key no tiene permisos para localhost:9002. Usando enlace directo a Google Maps.");
    };

    const handleIframeLoad = () => {
        console.log('Mapa cargado exitosamente');
        // Verificar si el iframe muestra un error de autorización
        try {
            const iframe = event?.target as HTMLIFrameElement;
            // No podemos acceder al contenido del iframe por CORS, pero podemos detectar algunos errores
        } catch (e) {
            console.log('No se puede verificar el contenido del iframe debido a CORS');
        }
        setMapError(null);
    };

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
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            {mapError || "No se pudo generar el mapa"}
                        </AlertDescription>
                    </Alert>
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
                {/* Mostrar alerta con información del error de autorización */}
                <Alert className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>Problema de autorización:</strong> La API key no autoriza localhost:9002.
                        <br />
                        <small className="text-muted-foreground">
                            IP: 190.159.137.151 | Puerto: {typeof window !== 'undefined' ? window.location.port : 'N/A'}
                        </small>
                    </AlertDescription>
                </Alert>

                {mapError && (
                    <Alert className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{mapError}</AlertDescription>
                    </Alert>
                )}
                
                <div className="space-y-4">
                    {/* Iframe del mapa (puede fallar) */}
                    <div className="aspect-video w-full rounded-md overflow-hidden border bg-gray-100">
                        <iframe
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            loading="lazy"
                            allowFullScreen
                            referrerPolicy="no-referrer-when-downgrade"
                            src={mapSrc}
                            onError={handleIframeError}
                            onLoad={handleIframeLoad}
                            title={`Mapa de ${address}, ${city}`}
                        />
                    </div>
                    
                    {/* Botón de fallback siempre visible */}
                    <div className="flex flex-col sm:flex-row gap-2">
                        <button
                            onClick={() => {
                                const query = encodeURIComponent(`${address}, ${city}, Colombia`);
                                const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
                                window.open(googleMapsUrl, '_blank');
                            }}
                            className="flex-1 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-blue-200 rounded-md transition-colors"
                        >
                            🔗 Abrir en Google Maps
                        </button>
                        <button
                            onClick={() => {
                                const query = encodeURIComponent(`${address}, ${city}, Colombia`);
                                const googleMapsUrl = `https://www.google.com/maps/dir//${query}`;
                                window.open(googleMapsUrl, '_blank');
                            }}
                            className="flex-1 px-4 py-2 text-sm font-medium text-green-600 hover:text-green-800 hover:bg-green-50 border border-green-200 rounded-md transition-colors"
                        >
                            🧭 Obtener direcciones
                        </button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
