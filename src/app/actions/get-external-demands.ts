'use server';

// This file is no longer in use.
// The logic for fetching external data has been moved directly into the
// client component at `src/app/dashboard/gestion-demandas/page.tsx`
// to handle the entire data fetching process in one place.
// This server action is kept to avoid breaking potential imports, but it is deprecated.

export async function getExternalDemands(): Promise<{
  success: boolean;
  error?: string;
}> {
  console.warn("DEPRECATED: getExternalDemands is no longer in use.");
  return {
    success: false,
    error: "This function is deprecated and should not be used.",
  };
}
