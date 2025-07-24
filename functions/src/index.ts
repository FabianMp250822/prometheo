
// eslint-disable-line max-len
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {onRequest} from "firebase-functions/v2/https";
import * as nodemailer from "nodemailer";

// Initialize Firebase Admin if not already initialized
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
  secure: false,
  auth: {
    user: "noreply@tecnosalud.cloud",
    pass: "@V1g@1l250822",
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Relevant legal concept prefixes
const SENTENCE_CONCEPT_PREFIXES = ["470-", "785-", "475-"];

interface PaymentDetail {
  nombre?: string;
  codigo?: string | null;
  ingresos?: number;
  egresos?: number;
}

// Trigger for new documents in payments
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
        `Payment ${pagoId} has no data or "detalles" field. Exiting.`
      );
      return;
    }

    const sentenceConcepts = paymentData.detalles.filter(
      (detail: PaymentDetail) =>
        SENTENCE_CONCEPT_PREFIXES.some((prefix) =>
          detail.nombre?.startsWith(prefix)
        )
    );

    if (sentenceConcepts.length === 0) {
      logger.info(`No sentence concepts in pmt ${pagoId}. Skipping.`);
      return;
    }

    logger.info(
      `Found ${sentenceConcepts.length} concepts in pmt ${pagoId}.`
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
      pensionadoId,
      periodoPago: paymentData.periodoPago,
    };

    try {
      await newProcessDocRef.set(newProcessData);
      logger.info(
        `Created proc doc ${newProcessDocRef.id} for pmt ${pagoId}.`
      );
    } catch (error) {
      logger.error(`Error creating proc doc for pmt ${pagoId}:`, error);
      throw error;
    }
  }
);

// ===================================
// HTTP Function: sendPaymentReminder
// ===================================
export const sendPaymentReminder = onRequest(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).send("");
  }

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
    return res.status(400).json({
      message:
        "Required parameters: emailUsuario, nombreUsuario, etc.",
    });
  }

  const subject = "Recordatorio de Pago Pendiente - Dajusticia";
  const mailOptions = {
    from: `"Dajusticia - Recordatorio" <noreply@tecnosalud.cloud>`,
    to: emailUsuario,
    cc: "director.dajusticia@gmail.com",
    subject,
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
    return res.status(200).json({
      message: "Reminder sent successfully",
      messageId: info.messageId,
    });
  } catch (error) {
    logger.error("Error sending reminder:", error);
    return res.status(500).json({
      message: "Error sending reminder email",
      error: (error as Error).message,
    });
  }
});
