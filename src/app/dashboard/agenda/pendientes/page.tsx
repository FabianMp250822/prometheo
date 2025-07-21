'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PendientesPage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to the more powerful "por-fecha" page as it handles all pending logic now.
        router.replace('/dashboard/agenda/por-fecha');
    }, [router]);

    // Render nothing, or a loading spinner, while redirecting
    return null;
}
