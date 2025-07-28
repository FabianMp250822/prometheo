'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Gavel, TrendingUp, Banknote, UserCircle, Clock } from "lucide-react";
import { useAuth } from '@/context/auth-provider';
import { getIdTokenResult } from 'firebase/auth';

export default function DashboardPage() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string>('');
  const [greeting, setGreeting] = useState('');
  const [sessionDuration, setSessionDuration] = useState('00:00:00');
  
  const sessionStartTime = new Date();

  useEffect(() => {
    if (user) {
      user.getIdTokenResult().then(idTokenResult => {
        const role = idTokenResult.claims.role as string | undefined;
        setUserRole(role || 'Usuario');
      });
    }

    const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return "Buenos días";
      if (hour < 18) return "Buenas tardes";
      return "Buenas noches";
    };
    setGreeting(getGreeting());
    
    const timer = setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - sessionStartTime.getTime();
      
      const hours = String(Math.floor(diff / 3600000)).padStart(2, '0');
      const minutes = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      const seconds = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      
      setSessionDuration(`${hours}:${minutes}:${seconds}`);
    }, 1000);
    
    return () => clearInterval(timer);

  }, [user]);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-headline text-foreground mb-2">
           {greeting}, {user?.displayName || 'Usuario'}!
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground">
            <div className="flex items-center gap-2">
                <UserCircle className="h-5 w-5" />
                <span>Rol: <span className="font-semibold text-primary">{userRole}</span></span>
            </div>
             <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span>Tiempo en sesión: <span className="font-semibold text-primary">{sessionDuration}</span></span>
            </div>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="bg-accent/20 p-3 rounded-full">
                <Gavel className="h-6 w-6 text-accent" />
              </div>
              <div>
                <CardTitle className="text-xl font-headline">Pago de Sentencias</CardTitle>
                <CardDescription>Visualice, filtre y gestione todas los pagos de sentencias.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button asChild className="w-full">
              <Link href="/dashboard/pagos/sentencias">Ir a Pagos de Sentencias</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-headline">Liquidaciones</CardTitle>
                <CardDescription>Genere y consulte liquidaciones de pagos.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button asChild className="w-full" variant="outline">
              <Link href="/dashboard/liquidaciones">Ir a Liquidaciones</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-4">
               <div className="bg-emerald-500/10 p-3 rounded-full">
                <Banknote className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-headline">Gestión de Pagos</CardTitle>
                <CardDescription>Realice seguimiento al historial de pagos.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
             <Button asChild className="w-full" variant="outline">
              <Link href="/dashboard/pagos">Ir a Pagos</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
