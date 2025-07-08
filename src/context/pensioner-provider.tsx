'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Pensioner } from '@/lib/data';

interface PensionerContextType {
    selectedPensioner: Pensioner | null;
    setSelectedPensioner: (pensioner: Pensioner | null) => void;
}

const PensionerContext = createContext<PensionerContextType | undefined>(undefined);

export function PensionerProvider({ children }: { children: ReactNode }) {
    const [selectedPensioner, setSelectedPensioner] = useState<Pensioner | null>(null);

    return (
        <PensionerContext.Provider value={{ selectedPensioner, setSelectedPensioner }}>
            {children}
        </PensionerContext.Provider>
    );
}

export function usePensioner() {
    const context = useContext(PensionerContext);
    if (context === undefined) {
        throw new Error('usePensioner must be used within a PensionerProvider');
    }
    return context;
}
