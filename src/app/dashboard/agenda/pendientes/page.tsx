'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PendientesPage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to the more powerful "por-fecha" page
        router.replace('/dashboard/agenda/por-fecha');
    }, [router]);

    // Render nothing, or a loading spinner, while redirecting
    return null;
}
