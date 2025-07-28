
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'support';
}

export function SupportChat() {
    const [messages, setMessages] = useState<Message[]>([
        { id: 1, text: "Hola, bienvenido al soporte de DAJUSTICIA. ¿En qué podemos ayudarle hoy?", sender: 'support' }
    ]);
    const [newMessage, setNewMessage] = useState('');

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() === '') return;

        const userMessage: Message = {
            id: Date.now(),
            text: newMessage,
            sender: 'user',
        };

        setMessages(prev => [...prev, userMessage]);
        setNewMessage('');

        // Simulate support response
        setTimeout(() => {
            const supportResponse: Message = {
                id: Date.now() + 1,
                text: "Hemos recibido su mensaje. Uno de nuestros agentes le responderá pronto.",
                sender: 'support'
            };
            setMessages(prev => [...prev, supportResponse]);
        }, 1500);
    };

    return (
        <Card className="h-[70vh] flex flex-col">
            <CardHeader>
                <CardTitle>Chat de Soporte</CardTitle>
                <CardDescription>Comuníquese con nuestro equipo para cualquier consulta sobre su caso.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
                <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-4">
                        {messages.map(message => (
                            <div key={message.id} className={cn("flex items-end gap-2", message.sender === 'user' ? 'justify-end' : 'justify-start')}>
                                {message.sender === 'support' && (
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src="https://placehold.co/100x100/1B4D3E/FFFFFF.png" alt="Soporte" data-ai-hint="logo symbol" />
                                        <AvatarFallback>S</AvatarFallback>
                                    </Avatar>
                                )}
                                <div className={cn("max-w-xs md:max-w-md p-3 rounded-lg", message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                    <p className="text-sm">{message.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-4 border-t">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Escriba su mensaje aquí..."
                        autoComplete="off"
                    />
                    <Button type="submit" size="icon">
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
