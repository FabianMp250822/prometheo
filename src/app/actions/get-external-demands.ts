'use server';

import { getDbConnection, closeDbConnection } from '@/services/mysql-service';

export async function checkDbConnection(): Promise<{ success: boolean; error?: string }> {
    let connection;
    try {
        connection = await getDbConnection();
        // A successful connection means the check is passed.
        return { success: true };
    } catch (error: any) {
        console.error("Database connection check failed:", error);
        return { success: false, error: error.message };
    } finally {
        if (connection) {
            await closeDbConnection(connection);
        }
    }
}

export async function getExternalDemands(cedula: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    if (!cedula) {
        return { success: false, error: 'Cédula no proporcionada.' };
    }

    let connection;
    try {
        connection = await getDbConnection();
        const [rows] = await connection.execute(
            'SELECT * FROM `procesos` WHERE `identidad_clientes` = ?',
            [cedula]
        );
        return { success: true, data: rows as any[] };
    } catch (error: any) {
        console.error(`Failed to fetch demands for cedula ${cedula}:`, error);
        return { success: false, error: 'Error al consultar las demandas: ' + error.message };
    } finally {
        if (connection) {
            await closeDbConnection(connection);
        }
    }
}
