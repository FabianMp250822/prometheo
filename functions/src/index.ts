
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
import {onSchedule} from "firebase-functions/v2/scheduler";
import fetch from "node-fetch";
import {getAuth} from "firebase-admin/auth";
import { queryDatabase } from "./mysql";

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

    logger.info(
      `Found ${sentenceConcepts.length} concepts in pmt ${pagoId}.`,
    );

    const newProcessDocRef = db.collection("procesoscancelados").doc();

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
      pagoId: paymentData.pagoId || pagoId,
      pensionadoId: pensionadoId,
      periodoPago: paymentData.periodoPago,
    };

    try {
      await newProcessDocRef.set(newProcessData);
      logger.info(
        `Created proc doc ${newProcessDocRef.id} for pmt ${pagoId}.`,
      );
    } catch (error) {
      logger.error(`Error creating proc doc for pmt ${pagoId}:`, error);
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
// Scheduled Function: Sync Notifications
// =====================================

const API_BASE_URL = "https://apiclient.proviredcolombia.com";
const STATIC_TOKEN =
"iYmMqGfKb057z8ImmAm82ULmMgd26lelgs5BcYkOkQJgkacDljdbBbyb4Dh2pPP8";

let jwtToken: string | null = null;
let tokenExpiresAt: number | null = null;

/**
 * Retrieves a JWT token, fetching a new one if expired.
 * @return {Promise<string>} The JWT token.
 */
async function getJwtToken(): Promise<string> {
  if (jwtToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
    return jwtToken;
  }

  logger.info("JWT is expired or null, fetching a new one.");
  const response = await fetch(`${API_BASE_URL}/token`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({token: STATIC_TOKEN}),
  });

  if (!response.ok) {
    throw new Error(`Failed to get JWT: ${response.status}`);
  }

  const data = (await response.json()) as { token: string };
  if (!data.token) {
    throw new Error("JWT not found in token response");
  }

  jwtToken = data.token;
  tokenExpiresAt = Date.now() + 5 * 60 * 60 * 1000; // 5 hours expiration
  return jwtToken;
}

/**
 * Makes an authenticated request to the Provired API.
 * @param {string} endpoint The API endpoint to call.
 * @param {string} method The method for the API request body.
 * @return {Promise<Record<string, unknown>[]>} The data from the API.
 */
async function makeApiRequest(
  endpoint: string,
  method: string,
): Promise<Record<string, unknown>[]> {
  const jwt = await getJwtToken();
  const body = JSON.stringify({method, params: {}});
  const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${jwt}`,
    },
    body,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API Error: ${response.status} ${errorBody}`);
  }

  const responseData = await response.json() as { data: any[] };
  return responseData.data || [];
}

export const syncDailyNotifications = onSchedule("every day 07:00",
  async () => {
    logger.info("Starting daily notification sync...");
    try {
      // 1. Fetch existing notification identifiers from Firestore to avoid duplicates
      const existingNotifsSnapshot = await db
        .collection("provired_notifications").select("uniqueId").get();
      const existingNotifIds = new Set(
        existingNotifsSnapshot.docs.map((doc) => doc.data().uniqueId),
      );
      logger.info(`Found ${existingNotifIds.size} existing notifs in DB.`);

      // 2. Fetch all notifications from the external API
      const newNotifications = (
        await makeApiRequest("report", "getData")
        ) as {
        fechaPublicacion: string,
        radicacion: string,
        demandante?: string,
        demandado?: string
      }[];
      if (!Array.isArray(newNotifications) || newNotifications.length === 0) {
        logger.info("No new notifications to sync from API.");
        return;
      }
      logger.info(`Fetched ${newNotifications.length} notifs from API.`);

      // 3. Filter out notifications that already exist in the database
      const notificationsToSave = newNotifications.filter((item) => {
        const uniqueId = `${item.fechaPublicacion}-${item.radicacion}`
          .replace(/\s+/g, "");
        return !existingNotifIds.has(uniqueId);
      });

      if (notificationsToSave.length === 0) {
        logger.info("No new notifications to save after filtering.");
        return;
      }
      logger.info(
        `Found ${notificationsToSave.length} new notifications to save.`,
      );

      // 4. Save the new notifications in batches
      const BATCH_SIZE = 400; // Firestore batch limit is 500
      for (let i = 0; i < notificationsToSave.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = notificationsToSave.slice(i, i + BATCH_SIZE);
        chunk.forEach((item) => {
          const uniqueId = `${item.fechaPublicacion}-${item.radicacion}`
            .replace(/\s+/g, "");
            // Auto-generate ID
          const docRef = db.collection("provired_notifications").doc();
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
          `Committed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
            notificationsToSave.length / BATCH_SIZE,
          )}.`,
        );
      }

      logger.info("Daily notification sync completed successfully.");
    } catch (error) {
      logger.error("Error during daily notification sync:", error);
      // Throw error to indicate failure for potential retries
      throw error;
    }
  });

// =====================================
// User Management Functions
// =====================================

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
            return { success: false, error: "No se encontraron procesos en la base de datos externa." };
        }
        logger.info(`Found ${procesos.length} processes to sync.`);

        // Step 2: Get unique process IDs
        const uniqueIds = [...new Set(procesos.map((p) => p.num_registro).filter(Boolean))];
        if (uniqueIds.length === 0) {
             return { success: true, data: { procesos: [], demandantes: {}, anotaciones: {}, anexos: {} } };
        }
        
        // Step 3: Fetch related data for all unique IDs in parallel
        const [demandantesResults, anotacionesResults, anexosResults] = await Promise.all([
            queryDatabase("SELECT * FROM `demandantes` WHERE `num_registro` IN (?)", [uniqueIds]),
            queryDatabase("SELECT * FROM `anotaciones` WHERE `num_registro` IN (?)", [uniqueIds]),
            queryDatabase("SELECT * FROM `anexos` WHERE `num_registro` IN (?)", [uniqueIds]),
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

        const demandantes = groupById(demandantesResults, 'num_registro');
        const anotaciones = groupById(anotacionesResults, 'num_registro');
        const anexos = groupById(anexosResults, 'num_registro');

        logger.info("Successfully fetched all external data directly from MySQL.");
        return { success: true, data: { procesos, demandantes, anotaciones, anexos } };
    } catch (error: any) {
        logger.error("Error during direct MySQL data sync:", error);
        // Provide a clear error message to the client
        throw new HttpsError("internal", `Error de base de datos externa: ${error.message}`);
    }
});
