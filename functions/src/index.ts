
/**
 * @fileOverview Cloud Functions for Prometeo app.
 *
 * This file contains the backend logic for:
 * - Automatically creating 'procesoscancelados' documents from new payments.
 * - Sending payment reminder emails via an HTTP endpoint.
 * - Daily synchronization of Provired notifications.
 */

import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore, Timestamp, WriteBatch} from "firebase-admin/firestore";
import {onRequest, Request, Response} from "firebase-functions/v2/https";
import * as nodemailer from "nodemailer";
import {onSchedule} from "firebase-functions/v2/scheduler";
import fetch from "node-fetch";

// Initialize admin SDK if not already initialized
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

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

// Define the prefixes for the legal concepts we're interested in.
const SENTENCE_CONCEPT_PREFIXES = ["470-", "785-", "475-"];

// Define a type for payment details to avoid using 'any'.
interface PaymentDetail {
  nombre?: string;
  codigo?: string | null;
  ingresos?: number;
  egresos?: number;
}

/**
 * A Cloud Function that triggers when a new payment is created.
 * It checks for specific legal concepts within the payment details and,
 * if found, creates a corresponding document in the 'procesoscancelados'
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
      paymentData.fechaProcesado.toDate() :
      new Date();

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


// ===================================
// HTTP Function: sendPaymentReminder
// ===================================
export const sendPaymentReminder = onRequest(
  async (req: Request, res: Response) => {
    // Handle OPTIONS request for CORS preflight
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      res.status(204).send("");
      return;
    }

    // Set CORS headers for the main request
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    const {
      emailUsuario,
      nombreUsuario,
      deudaActual,
      cuotaSugerida,
    } = req.body;

    if (!emailUsuario || !nombreUsuario || !deudaActual || !cuotaSugerida) {
      logger.error("Missing parameters in the request", req.body);
      res.status(400).json({
        message: "Required parameters: emailUsuario, nombreUsuario, etc.",
      });
      return;
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
      res.status(200).json({
        message: "Reminder sent successfully",
        messageId: info.messageId,
      });
    } catch (error) {
      logger.error("Error sending reminder:", error);
      res.status(500).json({
        message: "Error sending reminder email",
        error: (error as Error).message,
      });
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

  const data = (await response.json()) as {token?: string};
  if (!data.token) {
    throw new Error("JWT not found in token response");
  }

  jwtToken = data.token;
  tokenExpiresAt = Date.now() + 5 * 60 * 60 * 1000; // 5 hours expiration
  return jwtToken;
}

async function makeApiRequest(endpoint: string, method: string) {
  const jwt = await getJwtToken();
  const body = JSON.stringify({method, params: {}});
  const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
    method: "POST",
    headers: {"Content-Type": "application/json", Authorization: `Bearer ${jwt}`},
    body,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API Error: ${response.status} ${errorBody}`);
  }

  const responseData = (await response.json()) as {data?: any[]};
  return responseData.data || [];
}

export const syncDailyNotifications = onSchedule("every day 07:00", async () => {
  logger.info("Starting daily notification sync...");
  try {
    const notifications = await makeApiRequest("report", "getData");
    if (!Array.isArray(notifications) || notifications.length === 0) {
      logger.info("No new notifications to sync.");
      return;
    }

    logger.info(`Fetched ${notifications.length} notifications from API.`);

    const BATCH_SIZE = 400;
    for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
      const batch: WriteBatch = db.batch();
      const chunk = notifications.slice(i, i + BATCH_SIZE);

      chunk.forEach((item) => {
        const docId = db.collection("provired_notifications").doc().id;
        const docRef = db.collection("provired_notifications").doc(docId);
        item.demandante_lower = item.demandante?.toLowerCase() || "";
        item.demandado_lower = item.demandado?.toLowerCase() || "";
        batch.set(docRef, item);
      });

      await batch.commit();
      logger.info(`Committed batch ${i / BATCH_SIZE + 1}.`);
    }

    logger.info("Daily notification sync completed successfully.");
  } catch (error) {
    logger.error("Error during daily notification sync:", error);
    // Throw error to indicate failure for potential retries
    throw error;
  }
});
