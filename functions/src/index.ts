
/* eslint-disable max-len */
/**
 * @fileOverview Cloud Functions for Prometeo app.
 *
 * This file contains the backend logic for:
 * - Automatically creating "procesoscancelados" documents from new payments.
 * - Sending payment reminder emails via a callable function.
 * - Daily synchronization of Provired notifications.
 */

import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import * as nodemailer from "nodemailer";
import fetch from "node-fetch";
import {getAuth} from "firebase-admin/auth";
import {queryDatabase} from "./mysql.js";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as webpush from "web-push";

// Type definitions moved from @/lib/data to resolve import issue
export interface Anotacion {
    id?: string;
    auto: string;
    num_registro: string;
    fecha: string;
    fecha_limite: string;
    fecha_limite_ordenable: string;
    hora_limite: string;
    detalle: string;
    clase: string;
    nombre_documento: string | null;
    archivo_url: string | null;
    resumen?: string;
    notification24hSent?: boolean;
    notificationTodaySent?: boolean;
    ubicacion?: string;
}
export interface Tarea {
    id?: string;
    detalle: string;
    fecha_limite: string;
    fecha_limite_ordenable: string;
    hora_limite: string;
    ubicacion?: string;
    creadoEn: Timestamp;
    type: "GENERAL";
    resumen?: string;
    notification24hSent?: boolean;
    notificationTodaySent?: boolean;
}


const ALLOWED_ORIGINS = [
  "https://9000-firebase-studio-1751988148835.cluster-joak5ukfbnbyqspg4tewa33d24.cloudworkstations.dev",
  "https://studio--prometeo-ffd3w.us-central1.hosted.app",
  "https://www.dajusticia.com",
  "https://www.dajusticia.com.co",
  "https://www.dajusticia.org",
];


// Initialize admin SDK if not already initialized
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

// ============================
// Web Push Configuration
// ============================
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:director.dajusticia@gmail.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  logger.warn("VAPID keys not set. Push notifications will be disabled.");
}

// ============================
// Nodemailer Configuration
// ============================
const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 587,
  secure: false, // Use false for STARTTLS on port 587
  auth: {
    user: "noreply@tecnosalud.cloud",
    pass: "@V1g@1l250822",
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Define the prefixes for the legal concepts we"re interested in.
const SENTENCE_CONCEPT_PREFIXES = ["470-", "785-", "475-"];

// Define a type for payment details to avoid using "any".
interface PaymentDetail {
  nombre?: string;
  codigo?: string | null;
  ingresos?: number;
  egresos?: number;
}

/**
 * A Cloud Function that triggers when a new payment is created.
 * It checks for specific legal concepts within the payment details and,
 * if found, creates a corresponding document in the "procesoscancelados"
 * collection.
 */
export const onNewPaymentCreate = onDocumentCreated(
  "pensionados/{pensionadoId}/pagos/{pagoId}",
  async (event) => {
    const snap = event.data;
    if (!snap) {
      logger.info("No data associated with the event. Exiting.");
      return;
    }

    const paymentData = snap.data();
    const {pagoId, pensionadoId} = event.params;

    if (!paymentData || !Array.isArray(paymentData.detalles)) {
      logger.info(
        `Payment ${pagoId} has no data or "detalles" field. Exiting.`,
      );
      return;
    }

    // Filter for details that match our sentence concepts.
    const sentenceConcepts = paymentData.detalles.filter(
      (detail: PaymentDetail) =>
        SENTENCE_CONCEPT_PREFIXES.some((prefix) =>
          detail.nombre?.startsWith(prefix),
        ),
    );

    // If no sentence-related concepts are found, do nothing.
    if (sentenceConcepts.length === 0) {
      logger.info(`No sentence concepts in pmt ${pagoId}. Skipping.`);
      return;
    }

    // Use the pagoId as the document ID in procesoscancelados to prevent duplicates
    const newProcessDocRef = db.collection("procesoscancelados").doc(pagoId);

    const fechaLiquidacionDate = paymentData.fechaProcesado?.toDate ?
      paymentData.fechaProcesado.toDate() : new Date();

    const newProcessData = {
      año: paymentData.año,
      conceptos: sentenceConcepts.map((c: PaymentDetail) => ({
        codigo: c.codigo || c.nombre?.split("-")[0] || "",
        nombre: c.nombre,
        ingresos: c.ingresos || 0,
        egresos: c.egresos || 0,
      })),
      creadoEn: Timestamp.now(),
      fechaLiquidacion: fechaLiquidacionDate.toISOString(),
      pagoId: pagoId,
      pensionadoId: pensionadoId,
      periodoPago: paymentData.periodoPago,
    };

    try {
      // Use set() with the specific doc ID to either create or overwrite.
      await newProcessDocRef.set(newProcessData, {merge: true});
      logger.info(
        `Created/Updated procesoscancelados doc ${pagoId}.`,
      );
    } catch (error) {
      logger.error(`Error creating/updating doc for pmt ${pagoId}:`, error);
      // Let the function fail to indicate an error, which can trigger retries.
      throw error;
    }
  },
);


// ===============================================
// Secure Callable Function: sendPaymentReminder
// ===============================================
export const sendPaymentReminder = onCall(
  {cors: ALLOWED_ORIGINS}, // Firebase handles CORS for callable functions
  async (request) => {
    // Check if the user is authenticated.
    // This provides a layer of security, only allowing app users to trigger this.
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated.",
      );
    }

    const {
      emailUsuario,
      nombreUsuario,
      deudaActual,
      cuotaSugerida,
    } = request.data;

    if (!emailUsuario || !nombreUsuario || !deudaActual || !cuotaSugerida) {
      logger.error("Missing parameters in the request", request.data);
      throw new HttpsError(
        "invalid-argument",
        "Required parameters: emailUsuario, nombreUsuario, deudaActual, cuotaSugerida.",
      );
    }

    const subject = "Recordatorio de Pago Pendiente - Dajusticia";
    const mailOptions = {
      from: "\"Dajusticia - Recordatorio\" <noreply@tecnosalud.cloud>",
      to: emailUsuario,
      cc: "director.dajusticia@gmail.com",
      subject: subject,
      html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${subject}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
    .header {
      background: #ffffff;
      text-align: center;
      padding: 20px;
    }
    .header img {
      max-width: 150px;
    }
    .content {
      padding: 20px;
      text-align: center;
    }
    .content h1 {
      color: #d32f2f;
    }
    .details {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
    }
    .details p {
      margin: 5px 0;
      font-size: 16px;
    }
    .details strong {
      color: #1976d2;
    }
    .footer {
      background: #1976d2;
      color: #ffffff;
      text-align: center;
      padding: 15px;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://dajusticia.com/web/wp-content/uploads/2024/01/logo-dajusticia-8.png"
        alt="Dajusticia" />
    </div>
    <div class="content">
      <h1>Recordatorio de Pago Pendiente</h1>
      <p>Estimado(a) ${nombreUsuario},</p>
      <p>Le escribimos para recordarle que tiene un saldo pendiente.</p>
      <div class="details">
        <p>Deuda Actual: <strong>$${deudaActual}</strong></p>
        <p>Próxima cuota: <strong>$${cuotaSugerida}</strong></p>
      </div>
      <p>Para evitar inconvenientes, realice su pago lo antes posible.</p>
      <p>Si ya ha realizado el pago, por favor ignore este mensaje.</p>
    </div>
    <div class="footer">
      <p>Gracias por su atención.</p>
      <p>Equipo de Dajusticia</p>
    </div>
  </div>
</body>
</html>`,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      logger.info("Reminder sent:", info.messageId);
      return {
        success: true,
        message: "Reminder sent successfully",
        messageId: info.messageId,
      };
    } catch (error) {
      logger.error("Error sending reminder:", error);
      throw new HttpsError(
        "internal",
        "Error sending reminder email",
        (error as Error).message,
      );
    }
  },
);


// =====================================
// Provired API Configuration
// =====================================
const PROVIRED_API_BASE_URL = "https://apiclient.proviredcolombia.com";
const PROVIRED_STATIC_TOKEN = "iYmMqGfKb057z8ImmAm82ULmMgd26lelgs5BcYkOkQJgkacDljdbBbyb4Dh2pPP8";

let proviredJwtToken: string | null = null;
let proviredTokenExpiresAt: number | null = null;

/**
 * Retrieves a JWT token from Provired, caching it for 5 hours.
 * @return {Promise<string>} The JWT token.
 */
async function getProviredJwtToken(): Promise<string> {
  if (proviredJwtToken && proviredTokenExpiresAt && Date.now() < proviredTokenExpiresAt) {
    return proviredJwtToken;
  }
  logger.info("Provired JWT is expired or null, fetching a new one.");
  const response = await fetch(`${PROVIRED_API_BASE_URL}/token`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({token: PROVIRED_STATIC_TOKEN}),
  });
  if (!response.ok) {
    throw new Error(`Failed to get Provired JWT: ${response.status}`);
  }
  const data = (await response.json()) as { token: string };
  if (!data.token) {
    throw new Error("Provired JWT not found in token response");
  }
  proviredJwtToken = data.token;
  proviredTokenExpiresAt = Date.now() + 5 * 60 * 60 * 1000; // 5 hours expiration
  return proviredJwtToken;
}

/**
 * Makes an authenticated request to the Provired API.
 * @param {string} endpoint - The API endpoint to call.
 * @param {string} method - The method for the API request body.
 * @return {Promise<any[]>} The data array from the API response.
 */
async function makeProviredApiRequest(endpoint: string, method: string): Promise<any[]> {
  const jwt = await getProviredJwtToken();
  const body = JSON.stringify({method, params: {}});
  const response = await fetch(`${PROVIRED_API_BASE_URL}/${endpoint}`, {
    method: "POST",
    headers: {"Content-Type": "application/json", "Authorization": `Bearer ${jwt}`},
    body,
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Provired API Error: ${response.status} ${errorBody}`);
  }
  const responseData = await response.json() as { data: any[] };
  return responseData.data || [];
}

// =====================================
// Scheduled Function: Sync Notifications
// =====================================

export const scheduledProviredSync = onSchedule(
  {
    schedule: "0 7,15,23 * * *", // Runs at 7 AM, 3 PM, and 11 PM every day.
    timeZone: "America/Bogota",
  },
  async () => {
    logger.info("Starting scheduled Provired notification sync.");
    try {
      // 1. Fetch existing notification identifiers from Firestore to avoid duplicates
      const existingNotifsSnapshot = await db
        .collection("provired_notifications").select("uniqueId").get();
      const existingNotifIds = new Set(
        existingNotifsSnapshot.docs.map((doc) => doc.data().uniqueId),
      );
      logger.info(`Found ${existingNotifIds.size} existing Provired notifications in DB.`);

      // 2. Fetch all notifications from the external API
      const newNotifications = (await makeProviredApiRequest("notification", "getData")) as {
                fechaPublicacion: string,
                radicacion: string,
                demandante?: string,
                demandado?: string
            }[];
      if (!Array.isArray(newNotifications) || newNotifications.length === 0) {
        logger.info("No new notifications to sync from Provired API.");
        return;
      }
      logger.info(`Fetched ${newNotifications.length} notifications from Provired API.`);

      // 3. Filter out notifications that already exist in the database
      const notificationsToSave = newNotifications.filter((item) => {
        const uniqueId = `${item.fechaPublicacion}-${item.radicacion}`.replace(/\s+/g, "");
        return !existingNotifIds.has(uniqueId);
      });

      if (notificationsToSave.length === 0) {
        logger.info("No new Provired notifications to save after filtering.");
        return;
      }
      logger.info(`Found ${notificationsToSave.length} new Provired notifications to save.`);

      // 4. Save the new notifications in batches
      const BATCH_SIZE = 400; // Firestore batch limit is 500
      for (let i = 0; i < notificationsToSave.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = notificationsToSave.slice(i, i + BATCH_SIZE);
        chunk.forEach((item) => {
          const uniqueId = `${item.fechaPublicacion}-${item.radicacion}`.replace(/\s+/g, "");
          const docRef = db.collection("provired_notifications").doc(); // Auto-generate ID
          const dataToSet = {
            ...item,
            uniqueId: uniqueId,
            demandante_lower: (item.demandante || "").toLowerCase(),
            demandado_lower: (item.demandado || "").toLowerCase(),
            syncedAt: Timestamp.now(),
          };
          batch.set(docRef, dataToSet);
        });
        await batch.commit();
        logger.info(
          `Committed Provired batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
            notificationsToSave.length / BATCH_SIZE,
          )}.`,
        );
      }

      logger.info("Scheduled Provired notification sync completed successfully.");
    } catch (error) {
      logger.error("Error during scheduled Provired notification sync:", error);
      throw error; // Re-throw to indicate failure for potential retries
    }
  },
);


// =====================================
// User Management Functions
// =====================================
const defaultPermissionsByRole: { [key: string]: { [key: string]: boolean } } = {
  "Administrador": {
    canViewDashboard: true, canViewBuscador: true, canViewHojaDeVida: true,
    canViewAgenda: true, canViewLiquidaciones: true, canViewPagosSentencias: true,
    canViewContabilidad: true, canViewProcesosEnLinea: true, canViewReportes: true,
    canViewGestionDemandas: true, canManageUsers: true, canAccessConfiguracion: true,
  },
  "Abogado Titular": {
    canViewDashboard: true, canViewBuscador: true, canViewHojaDeVida: true,
    canViewAgenda: true, canViewLiquidaciones: true, canViewPagosSentencias: true,
    canViewContabilidad: false, canViewProcesosEnLinea: true, canViewReportes: false,
    canViewGestionDemandas: true, canManageUsers: false, canAccessConfiguracion: false,
  },
  "Abogado Externo": {
    canViewDashboard: true, canViewBuscador: true, canViewHojaDeVida: true,
    canViewAgenda: true, canViewLiquidaciones: false, canViewPagosSentencias: false,
    canViewContabilidad: false, canViewProcesosEnLinea: true, canViewReportes: false,
    canViewGestionDemandas: true, canManageUsers: false, canAccessConfiguracion: false,
  },
  "Contador": {
    canViewDashboard: true, canViewBuscador: true, canViewHojaDeVida: false,
    canViewAgenda: false, canViewLiquidaciones: true, canViewPagosSentencias: true,
    canViewContabilidad: true, canViewProcesosEnLinea: false, canViewReportes: true,
    canViewGestionDemandas: false, canManageUsers: false, canAccessConfiguracion: true,
  },
};


export const createUser = onCall({cors: ALLOWED_ORIGINS}, async (request) => {
  // 1. Authentication Check: Ensure the caller is an authenticated admin.
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "The function must be called while authenticated.",
    );
  }
  const callerUid = request.auth.uid;
  const callerUserRecord = await auth.getUser(callerUid);
  if (callerUserRecord.customClaims?.role !== "Administrador") {
    throw new HttpsError("permission-denied", "Only administrators can create users.");
  }

  // 2. Data Validation
  const {email, password, displayName, role, associatedPensioners} =
  request.data;
  if (!email || !password || !displayName || !role) {
    throw new HttpsError(
      "invalid-argument",
      "Request must include email, password, displayName, and role.",
    );
  }

  // Get default permissions for the role
  const permissions = defaultPermissionsByRole[role as keyof typeof defaultPermissionsByRole] || {};

  try {
    // 3. Create user in Firebase Authentication
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: displayName,
    });

    // 4. Set custom claims for role-based access control
    await auth.setCustomUserClaims(userRecord.uid, {role: role});

    // 5. Create user profile in Firestore
    const userDocRef = db.collection("users").doc(userRecord.uid);
    await userDocRef.set({
      nombre: displayName,
      email: email,
      rol: role,
      permissions: permissions, // Add permissions object
      // Store associated pensioners for lawyers
      associatedPensioners: associatedPensioners || [],
      createdAt: Timestamp.now(),
    });

    logger.info(`Successfully created new user: ${email} with role ${role}`);
    return {success: true, uid: userRecord.uid};
  } catch (error: any) {
    logger.error("Error creating new user:", error);
    // Clean up partially created user if something went wrong
    if (error.code === "auth/email-already-exists") {
      throw new HttpsError(
        "already-exists",
        "This email is already in use by another account.",
      );
    }
    throw new HttpsError(
      "internal",
      "An unexpected error occurred while creating the user.",
      error.message,
    );
  }
});

/**
 * Triggered when a new user document is created in Firestore.
 * Automatically assigns the "Administrador" role to a specific hardcoded email.
 * This is a secure way to bootstrap the first administrator.
 */
export const onUserCreate = onDocumentCreated("users/{userId}", async (event) => {
  const userId = event.params.userId;
  const userData = event.data?.data();

  if (!userData) {
    logger.info(`No data for user ${userId}, skipping.`);
    return;
  }

  const adminEmail = "fabianmuniozpuello@gmail.com";

  logger.info(`Checking user ${userId} with email ${userData.email}`);

  if (userData.email === adminEmail) {
    try {
      await auth.setCustomUserClaims(userId, {role: "Administrador"});
      logger.info(`Successfully assigned 'Administrador' role to user ${userId} with email ${adminEmail}`);
    } catch (error) {
      logger.error(`Error setting admin role for user ${userId}:`, error);
    }
  }
});


export const setAdminRole = onCall({cors: ALLOWED_ORIGINS}, async (request) => {
  // This function is temporarily less secure to allow the first admin to be set.
  // REMOVE THE SECURITY BYPASS IN PRODUCTION.
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated to set roles.");
  }

  // SECURITY BYPASS: Commented out for initial setup.
  // const callerUid = request.auth.uid;
  // const callerUserRecord = await auth.getUser(callerUid);
  // if (callerUserRecord.customClaims?.role !== "Administrador") {
  //   throw new HttpsError("permission-denied", "Only administrators can set user roles.");
  // }

  const {uid, role} = request.data;
  if (!uid || !role) {
    throw new HttpsError("invalid-argument", "UID and role are required.");
  }

  try {
    await auth.setCustomUserClaims(uid, {role: role});
    // Also update the user's document in Firestore for consistency
    await db.collection("users").doc(uid).set({rol: role}, {merge: true});

    logger.info(`Successfully set role '${role}' for user ${uid}.`);
    return {success: true, message: `Role '${role}' assigned.`};
  } catch (error: any) {
    logger.error(`Error setting role for user ${uid}:`, error);
    throw new HttpsError("internal", "Failed to set user role.", error.message);
  }
});

export const listUsers = onCall({cors: ALLOWED_ORIGINS}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated to list users.");
  }

  const callerUid = request.auth.uid;
  const callerUserRecord = await auth.getUser(callerUid);

  if (callerUserRecord.customClaims?.role !== "Administrador") {
    throw new HttpsError("permission-denied", "Only administrators can list users.");
  }

  try {
    const userDocs = await db.collection("users").get();
    const users = userDocs.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return users;
  } catch (error: any) {
    logger.error("Error listing users:", error);
    throw new HttpsError("internal", "Failed to list users.", error.message);
  }
});


// =====================================
// Public Form Submission Handler
// =====================================

export const submitPublicForm = onCall({cors: ALLOWED_ORIGINS}, async (request) => {
  const {formType, data} = request.data;

  if (!formType || !data) {
    throw new HttpsError("invalid-argument", "Request must include formType and data.");
  }

  try {
    if (formType === "newsletter") {
      if (!data.email) throw new HttpsError("invalid-argument", "Newsletter form requires an email.");

      // Use email as doc ID to prevent duplicates
      const docRef = db.collection("suscriptores_boletin").doc(data.email);
      await docRef.set({
        email: data.email,
        subscribedAt: Timestamp.now(),
      });

      logger.info(`New newsletter subscription: ${data.email}`);
      return {success: true, message: "Subscription successful."};
    } else if (formType === "contact") {
      if (!data.name || !data.email || !data.message) {
        throw new HttpsError("invalid-argument", "Contact form requires name, email, and message.");
      }

      const collectionRef = db.collection("contactos_landing");
      await collectionRef.add({
        name: data.name,
        email: data.email,
        message: data.message,
        sentAt: Timestamp.now(),
      });

      logger.info(`New contact message from: ${data.email}`);
      return {success: true, message: "Contact message sent."};
    } else {
      throw new HttpsError("invalid-argument", `Unknown formType: ${formType}`);
    }
  } catch (error: any) {
    logger.error(`Error processing form (${formType}):`, error);
    throw new HttpsError("internal", "An error occurred while processing the form.", error.message);
  }
});

/**
 * @fileOverview This function connects directly to an external MySQL database
 * to sync legal process data. It replaces the previous method of calling
 * intermediary PHP scripts.
 *
 * It is triggered by a user action in the frontend and returns a comprehensive
 * dataset containing processes and their related sub-collections.
 * @param {object} request - The request object from the client. Must be authenticated.
 * @return {Promise<{success: boolean, data?: object, error?: string}>}
 * An object indicating success and containing the fetched data or an error message.
 */
export const syncExternalData = onCall({cors: ALLOWED_ORIGINS}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated to sync data.");
  }
  logger.info("Starting direct MySQL data sync triggered by user:", request.auth.uid);

  try {
    // Step 1: Fetch all main processes
    const procesos = await queryDatabase("SELECT * FROM `procesos`");
    if (!Array.isArray(procesos) || procesos.length === 0) {
      return {success: false, error: "No se encontraron procesos en la base de datos externa."};
    }
    logger.info(`Found ${procesos.length} processes to sync.`);

    // Step 2: Get unique process IDs
    const uniqueIds = [...new Set(procesos.map((p) => p.num_registro).filter(Boolean))];
    if (uniqueIds.length === 0) {
      return {success: true, data: {procesos: [], demandantes: {}, anotaciones: {}, anexos: {}}};
    }

    // Step 3: Fetch related data for all unique IDs in parallel
    const placeholders = uniqueIds.map(() => "?").join(",");

    const [demandantesResults, anotacionesResults, anexosResults] = await Promise.all([
      queryDatabase(`SELECT * FROM \`demandantes\` WHERE \`num_registro\` IN (${placeholders})`, uniqueIds),
      queryDatabase(`SELECT * FROM \`anotaciones\` WHERE \`num_registro\` IN (${placeholders})`, uniqueIds),
      queryDatabase(`SELECT * FROM \`anexos\` WHERE \`num_registro\` IN (${placeholders})`, uniqueIds),
    ]);


    // Step 4: Group the related data by process ID for easy lookup
    const groupById = (rows: any[], key: string) => {
      return rows.reduce((acc, row) => {
        const id = row[key];
        if (!acc[id]) acc[id] = [];
        acc[id].push(row);
        return acc;
      }, {});
    };

    const demandantes = groupById(demandantesResults, "num_registro");
    const anotaciones = groupById(anotacionesResults, "num_registro");
    const anexos = groupById(anexosResults, "num_registro");

    logger.info("Successfully fetched all external data directly from MySQL.");
    return {success: true, data: {procesos, demandantes, anotaciones, anexos}};
  } catch (error: any) {
    logger.error("Error during direct MySQL data sync:", error);
    // Provide a clear error message to the client
    throw new HttpsError("internal", `Error de base de datos externa: ${error.message}`);
  }
});


/**
 * Saves synced data from the external source to Firestore.
 * This function is callable from the client.
 * @return {Promise<{success: boolean, message: string}>} A confirmation object.
 */
export const saveSyncedData = onCall({cors: ALLOWED_ORIGINS}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated to save data.");
  }
  logger.info("Saving synced data triggered by user:", request.auth.uid);

  const data = request.data;
  if (!data || !data.procesos) {
    throw new HttpsError("invalid-argument", "No data provided to save.");
  }

  const {procesos, demandantes, anotaciones, anexos} = data;
  const BATCH_SIZE = 400; // Firestore batch writes are limited to 500 operations.

  try {
    for (let i = 0; i < procesos.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = procesos.slice(i, i + BATCH_SIZE);

      for (const proceso of chunk) {
        if (!proceso.num_registro) continue; // Skip if no ID
        const procesoDocRef = db.collection("procesos").doc(proceso.num_registro);
        batch.set(procesoDocRef, Object.fromEntries(Object.entries(proceso).filter(([, value]) => value != null)));

        // Add subcollections
        const subCollections = {
          demandantes: demandantes[proceso.num_registro],
          anotaciones: anotaciones[proceso.num_registro],
          anexos: anexos[proceso.num_registro],
        };

        for (const [key, items] of Object.entries(subCollections)) {
          if (items && Array.isArray(items) && items.length > 0) {
            const subCollectionRef = procesoDocRef.collection(key);
            items.forEach((item: any, index: number) => {
              // Use a unique field from the item or generate one if not available.
              const itemId = item.auto || item.id_anexo || item.identidad_demandante || `${Date.now()}-${index}`;
              if (itemId) {
                const itemDocRef = subCollectionRef.doc(itemId.toString());
                batch.set(itemDocRef, Object.fromEntries(Object.entries(item).filter(([, value]) => value != null)));
              }
            });
          }
        }
      }
      await batch.commit();
      logger.info(`Committed batch ${i / BATCH_SIZE + 1}.`);
      // Brief pause to avoid overwhelming Firestore.
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return {success: true, message: `${procesos.length} procesos guardados.`};
  } catch (error: any) {
    logger.error("Error saving synced data to Firestore:", error);
    throw new HttpsError("internal", "Failed to save data to Firestore.", error.message);
  }
});


// =====================================
// Scheduled Function: Sync External Data
// =====================================

// Helper function to group rows by a key
const groupById = (rows: any[], key: string) => {
  return rows.reduce((acc, row) => {
    const id = row[key];
    if (!acc[id]) acc[id] = [];
    acc[id].push(row);
    return acc;
  }, {});
};

/**
 * A scheduled function that runs twice daily to sync data from an external
 * MySQL database to Firestore. This replaces the manual sync process.
 */
export const scheduledSync = onSchedule(
  {
    schedule: "0 9,21 * * *", // Runs at 9:00 AM and 9:00 PM every day.
    timeZone: "America/Bogota",
  },
  async () => {
    logger.info("Starting scheduled data sync from external MySQL DB.");

    try {
      // Step 1: Fetch data from MySQL
      logger.info("Fetching data from MySQL...");
      const procesos = await queryDatabase("SELECT * FROM `procesos`");
      if (!Array.isArray(procesos) || procesos.length === 0) {
        logger.info("No processes found in external DB. Sync finished.");
        return;
      }
      logger.info(`Found ${procesos.length} processes to sync.`);

      const uniqueIds = [...new Set(procesos.map((p) => p.num_registro).filter(Boolean))];
      if (uniqueIds.length === 0) {
        logger.info("No unique process IDs found. Sync finished.");
        return;
      }
      const placeholders = uniqueIds.map(() => "?").join(",");

      const [demandantes, anotaciones, anexos] = await Promise.all([
        queryDatabase(`SELECT * FROM \`demandantes\` WHERE \`num_registro\` IN (${placeholders})`, uniqueIds).then((res) => groupById(res, "num_registro")),
        queryDatabase(`SELECT * FROM \`anotaciones\` WHERE \`num_registro\` IN (${placeholders})`, uniqueIds).then((res) => groupById(res, "num_registro")),
        queryDatabase(`SELECT * FROM \`anexos\` WHERE \`num_registro\` IN (${placeholders})`, uniqueIds).then((res) => groupById(res, "num_registro")),
      ]);

      logger.info("Successfully fetched all external data. Starting Firestore save.");

      // Step 2: Save data to Firestore
      const BATCH_SIZE = 400;
      for (let i = 0; i < procesos.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = procesos.slice(i, i + BATCH_SIZE);

        for (const proceso of chunk) {
          if (!proceso.num_registro) continue;
          const procesoDocRef = db.collection("procesos").doc(proceso.num_registro);
          batch.set(procesoDocRef, Object.fromEntries(Object.entries(proceso).filter(([, value]) => value != null)));

          const subCollections = {
            demandantes: demandantes[proceso.num_registro],
            anotaciones: anotaciones[proceso.num_registro],
            anexos: anexos[proceso.num_registro],
          };

          for (const [key, items] of Object.entries(subCollections)) {
            if (items && Array.isArray(items) && items.length > 0) {
              const subCollectionRef = procesoDocRef.collection(key);
              items.forEach((item: any, index: number) => {
                const itemId = item.auto || item.id_anexo || item.identidad_demandante || `${Date.now()}-${index}`;
                if (itemId) {
                  const itemDocRef = subCollectionRef.doc(itemId.toString());
                  batch.set(itemDocRef, Object.fromEntries(Object.entries(item).filter(([, value]) => value != null)));
                }
              });
            }
          }
        }
        await batch.commit();
        logger.info(`Committed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(procesos.length / BATCH_SIZE)}.`);
      }
      logger.info(`Scheduled sync completed successfully. ${procesos.length} processes saved.`);
    } catch (error: any) {
      logger.error("Error during scheduled sync:", error);
      throw error; // Re-throw to indicate failure for potential retries
    }
  },
);

// =====================================
// Scheduled Function: Agenda Reminders
// =====================================
export const sendAgendaReminders = onSchedule(
  {
    schedule: "every 1 hours",
    timeZone: "America/Bogota",
  },
  async () => {
    logger.info("Running hourly agenda reminder check.");
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Helper to convert DD-MM-YYYY from ordenable field to a Date object
    const parseDate = (dateStr: string): Date | null => {
      if (!dateStr || dateStr.length !== 10) return null;
      const parts = dateStr.split("-");
      if (parts.length !== 3) return null;
      // YYYY-MM-DD format from 'ordenable' field
      const date = new Date(`${parts[0]}-${parts[1]}-${parts[2]}T00:00:00Z`); // Use Z for UTC
      return isNaN(date.getTime()) ? null : date;
    };

    const sendReminder = async (task: Tarea | Anotacion, type: "24h" | "today", targetEmail: string) => {
      const subject = type === "24h" ?
        `Recordatorio: Tarea para Mañana - ${task.detalle.substring(0, 50)}` :
        `Recordatorio: Tarea para Hoy - ${task.detalle.substring(0, 50)}`;

      const mailOptions = {
        from: "\"Dajusticia - Agenda\" <noreply@tecnosalud.cloud>",
        to: targetEmail,
        subject: subject,
        html: `
                <h1>Recordatorio de Agenda</h1>
                <p>Este es un recordatorio para la siguiente tarea:</p>
                <h2>${task.detalle}</h2>
                <p><strong>Fecha Límite:</strong> ${task.fecha_limite} a las ${task.hora_limite || "todo el día"}</p>
                ${task.ubicacion ? `<p><strong>Ubicación/URL:</strong> <a href="${task.ubicacion}">${task.ubicacion}</a></p>` : ""}
                <p>Este es un correo automático, por favor no responda.</p>
            `,
      };

      try {
        await transporter.sendMail(mailOptions);
        logger.info(`Reminder email sent for task ${task.id} to ${targetEmail}. Type: ${type}`);
        return true;
      } catch (error) {
        logger.error(`Error sending reminder email for task ${task.id}:`, error);
        return false;
      }
    };

    const sendPushNotification = async (task: Tarea | Anotacion, userId: string) => {
      if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

      const subscriptionsSnapshot = await db.collection(`users/${userId}/pushSubscriptions`).get();
      if (subscriptionsSnapshot.empty) return;

      const payload = JSON.stringify({
        title: `Recordatorio de Agenda: ${task.detalle.substring(0, 30)}...`,
        body: `Fecha límite: ${task.fecha_limite} ${task.hora_limite || ""}`,
        icon: "https://firebasestorage.googleapis.com/v0/b/pensionados-d82b2.appspot.com/o/logos%2Flogo-removebg-preview.png?alt=media&token=9a935e08-66dd-4edc-83f8-31320b0b2680",
      });

      for (const doc of subscriptionsSnapshot.docs) {
        const subscription = doc.data();
        try {
          await webpush.sendNotification(subscription, payload);
          logger.info(`Push notification sent to user ${userId}`);
        } catch (error: any) {
          logger.error(`Error sending push notification to ${userId}:`, error);
          // If subscription is expired or invalid, delete it
          if (error.statusCode === 404 || error.statusCode === 410) {
            await doc.ref.delete();
            logger.info(`Deleted expired subscription for user ${userId}`);
          }
        }
      }
    };

    const processTasks = async (snapshot: FirebaseFirestore.QuerySnapshot, getCollectionPath: (doc: FirebaseFirestore.QueryDocumentSnapshot) => string) => {
      for (const doc of snapshot.docs) {
        const task = {id: doc.id, ...doc.data()} as Tarea | Anotacion;
        const taskDate = parseDate(task.fecha_limite_ordenable);
        if (!taskDate) continue;

        const isDueIn24Hours = taskDate > now && taskDate <= in24Hours;
        const isDueToday = taskDate.toDateString() === now.toDateString();

        // This is a placeholder. In a real app, you would determine the user associated with the task.
        // For now, we send to a default email and a hardcoded user ID for push.
        const targetUserId = "Q8bQ2sODa8M7MklkM2f8qD9bO9f2"; // Hardcoded Admin User ID
        const targetEmail = "director.dajusticia@gmail.com";

        // 24-hour reminder
        if (isDueIn24Hours && !task.notification24hSent) {
          const emailSent = await sendReminder(task, "24h", targetEmail);
          await sendPushNotification(task, targetUserId);
          if (emailSent) {
            const path = getCollectionPath(doc);
            await db.doc(path).update({notification24hSent: true});
          }
        }

        // Same-day reminder (at 7 AM Bogota time)
        const bogotaTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Bogota"}));
        if (isDueToday && bogotaTime.getHours() >= 7 && !task.notificationTodaySent) {
          const emailSent = await sendReminder(task, "today", targetEmail);
          await sendPushNotification(task, targetUserId);
          if (emailSent) {
            const path = getCollectionPath(doc);
            await db.doc(path).update({notificationTodaySent: true});
          }
        }
      }
    };

    try {
      // Process general tasks
      const tasksQuery = db.collection("tareas").where("fecha_limite_ordenable", "<=", in24Hours.toISOString().split("T")[0]);
      const tasksSnapshot = await tasksQuery.get();
      await processTasks(tasksSnapshot, (doc) => `tareas/${doc.id}`);

      // Process annotations from processes
      const anotacionesQuery = db.collectionGroup("anotaciones").where("fecha_limite_ordenable", "<=", in24Hours.toISOString().split("T")[0]);
      const anotacionesSnapshot = await anotacionesQuery.get();
      await processTasks(anotacionesSnapshot, (doc) => `procesos/${doc.ref.parent.parent?.id}/anotaciones/${doc.id}`);

      logger.info("Agenda reminder check completed.");
    } catch (error) {
      logger.error("Error running agenda reminder function:", error);
    }
  },
);

// =====================================
// Push Notification Subscription Handler
// =====================================
export const savePushSubscription = onCall({cors: ALLOWED_ORIGINS}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated to save subscription.");
  }
  const subscription = request.data.subscription;
  if (!subscription || !subscription.endpoint) {
    throw new HttpsError("invalid-argument", "A valid subscription object is required.");
  }

  const uid = request.auth.uid;
  const subscriptionCollection = db.collection(`users/${uid}/pushSubscriptions`);

  try {
    // Use the endpoint as a unique identifier to prevent duplicate subscriptions
    const docRef = subscriptionCollection.doc(Buffer.from(subscription.endpoint).toString("base64"));
    await docRef.set(subscription, {merge: true});
    logger.info(`Saved push subscription for user ${uid}`);
    return {success: true};
  } catch (error) {
    logger.error(`Failed to save push subscription for user ${uid}`, error);
    throw new HttpsError("internal", "Could not save push subscription.");
  }
});


