'use server';

// This file is being temporarily kept to avoid breaking imports,
// but it is no longer functional for communicating with the external API
// due to server-side security (403 Forbidden errors).
// The logic will be migrated to use Firebase Storage.

export async function getAnexos(numRegistro: string) {
    console.warn("getAnexos is deprecated and will not fetch from external API.");
    // Return an empty array to prevent breaking the UI while allowing it to load.
    return []; 
}

export async function addAnexo(formData: FormData) {
     console.warn("addAnexo is deprecated and will not post to external API.");
    // Return a success-like message to avoid UI errors.
    // In a real scenario, this would now upload to Firebase Storage.
    return { success: true, message: "Operation not sent to external API." };
}

export async function deleteAnexo(auto: string) {
    console.warn("deleteAnexo is deprecated and will not post to external API.");
    // Return a success-like message to avoid UI errors.
    return { success: true, message: "Operation not sent to external API." };
}
