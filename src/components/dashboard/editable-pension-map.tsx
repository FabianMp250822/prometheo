'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Save, Search, Edit3, X, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface EditablePensionMapProps {
    pensionerId: string;
    currentAddress: string | null | undefined;
    currentCity: string | null | undefined;
    onAddressUpdate?: (address: string, city: string) => void;
}

export function EditablePensionMap({ 
    pensionerId, 
    currentAddress, 
    currentCity, 
    onAddressUpdate 
}: EditablePensionMapProps) {
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [tempAddress, setTempAddress] = useState(currentAddress || '');
    const [tempCity, setTempCity] = useState(currentCity || '');
    const [searchQuery, setSearchQuery] = useState('');

    const currentEmbedUrl = React.useMemo(() => {
        if (!currentAddress || !currentCity) return null;
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) return null;
        const query = encodeURIComponent(`${currentAddress}, ${currentCity}, Colombia`);
        return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${query}&zoom=18&maptype=roadmap&language=es&region=CO`;
    }, [currentAddress, currentCity]);

    const searchEmbedUrl = React.useMemo(() => {
        if (!searchQuery.trim()) return null;
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) return null;
        const query = encodeURIComponent(`${searchQuery}, Colombia`);
        return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${query}&zoom=15&maptype=roadmap&language=es&region=CO`;
    }, [searchQuery]);

    const handleSaveLocation = useCallback(async () => {
        if (!tempAddress.trim() || !tempCity.trim()) {
            toast({
                variant: 'destructive',
                title: 'Campos requeridos',
                description: 'Por favor completa la dirección y la ciudad.'
            });
            return;
        }

        setIsSaving(true);
        try {
            const pensionerRef = doc(db, 'pensionados', pensionerId);
            await updateDoc(pensionerRef, {
                direccion: tempAddress.trim(),
                ciudad: tempCity.trim(),
                ubicacionActualizada: new Date().toISOString()
            });

            onAddressUpdate?.(tempAddress.trim(), tempCity.trim());
            setIsEditing(false);
            
            toast({
                title: 'Ubicación actualizada',
                description: 'La dirección se ha guardado correctamente en la base de datos.'
            });
        } catch (error) {
            console.error('Error updating location:', error);
            toast({
                variant: 'destructive',
                title: 'Error al guardar',
                description: 'No se pudo actualizar la ubicación. Inténtalo de nuevo.'
            });
        } finally {
            setIsSaving(false);
        }
    }, [tempAddress, tempCity, pensionerId, onAddressUpdate, toast]);

    const handleCancelEdit = useCallback(() => {
        setTempAddress(currentAddress || '');
        setTempCity(currentCity || '');
        setSearchQuery('');
        setIsEditing(false);
    }, [currentAddress, currentCity]);

    const handleUseSearchedLocation = useCallback(() => {
        if (searchQuery.trim()) {
            // Intentar extraer ciudad y dirección del search query
            const parts = searchQuery.split(',').map(part => part.trim());
            if (parts.length >= 2) {
                setTempAddress(parts[0]);
                setTempCity(parts[1]);
            } else {
                setTempAddress(searchQuery.trim());
                setTempCity(tempCity || 'Cartagena'); // Ciudad por defecto
            }
        }
    }, [searchQuery, tempCity]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Ubicación de Oficina ISS
                    </div>
                    <Button
                        variant={isEditing ? "destructive" : "outline"}
                        size="sm"
                        onClick={isEditing ? handleCancelEdit : () => setIsEditing(true)}
                    >
                        {isEditing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                        {isEditing ? 'Cancelar' : 'Editar'}
                    </Button>
                </CardTitle>
                <CardDescription>
                    {isEditing 
                        ? 'Busca y actualiza la ubicación de la oficina ISS'
                        : `Dirección actual: ${currentAddress || 'No definida'}, ${currentCity || 'No definida'}`
                    }
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isEditing && (
                    <>
                        {/* Búsqueda de ubicación */}
                        <div className="space-y-2">
                            <Label htmlFor="search-location">Buscar nueva ubicación</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="search-location"
                                    placeholder="Ej: Calle 123 #45-67, Cartagena"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <Button
                                    variant="outline"
                                    onClick={handleUseSearchedLocation}
                                    disabled={!searchQuery.trim()}
                                >
                                    <Search className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Vista previa de búsqueda */}
                        {searchEmbedUrl && (
                            <div className="space-y-2">
                                <Label>Vista previa de la búsqueda</Label>
                                <div className="aspect-video w-full rounded-md overflow-hidden border bg-muted">
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        style={{ border: 0 }}
                                        loading="lazy"
                                        allowFullScreen
                                        src={searchEmbedUrl}
                                        title={`Búsqueda: ${searchQuery}`}
                                    />
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleUseSearchedLocation}
                                    className="w-full"
                                >
                                    <Check className="h-4 w-4 mr-2" />
                                    Usar esta ubicación
                                </Button>
                            </div>
                        )}

                        {/* Formulario de edición manual */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="address">Dirección</Label>
                                <Input
                                    id="address"
                                    placeholder="Ej: Calle 123 #45-67"
                                    value={tempAddress}
                                    onChange={(e) => setTempAddress(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="city">Ciudad</Label>
                                <Input
                                    id="city"
                                    placeholder="Ej: Cartagena"
                                    value={tempCity}
                                    onChange={(e) => setTempCity(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Botón de guardar */}
                        <Button 
                            onClick={handleSaveLocation} 
                            disabled={isSaving || !tempAddress.trim() || !tempCity.trim()}
                            className="w-full"
                        >
                            {isSaving ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Guardar ubicación
                                </>
                            )}
                        </Button>
                    </>
                )}

                {/* Mapa actual */}
                {currentEmbedUrl && (
                    <div className="space-y-2">
                        <Label>{isEditing ? 'Ubicación actual' : 'Mapa de ubicación'}</Label>
                        <div className="aspect-video w-full rounded-md overflow-hidden border bg-muted">
                            <iframe
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                loading="lazy"
                                allowFullScreen
                                src={currentEmbedUrl}
                                title={`Mapa de ${currentAddress}, ${currentCity}`}
                            />
                        </div>
                    </div>
                )}

                {/* Mensaje si no hay ubicación */}
                {!currentAddress && !isEditing && (
                    <div className="text-center py-8 text-muted-foreground">
                        <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No hay ubicación definida</p>
                        <Button 
                            variant="outline" 
                            onClick={() => setIsEditing(true)}
                            className="mt-2"
                        >
                            <Edit3 className="h-4 w-4 mr-2" />
                            Agregar ubicación
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
