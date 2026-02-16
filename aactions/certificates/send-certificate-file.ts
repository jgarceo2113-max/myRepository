"use server";

import { createSessionClient } from "@/lib/server/appwrite";
import sgMail from "@sendgrid/mail";
import nodemailer from "nodemailer";
import { VoidActionResponse } from "../shared/types";
import { getEnv, getSMTPEnv } from "../shared/utils";
import { getCertificateFiles } from "./get-certificate-file";

export async function sendCertificateEmail({
  recipient,
  subject,
  html,
  certificateId,
  format = "pdf",
}: {
  recipient: string;
  subject: string;
  html: string;
  certificateId: string;
  format?: string;
}): Promise<VoidActionResponse> {
  try {
    // Prefer SendGrid if configured, otherwise fall back to SMTP.
    const sendgridKey = process.env.SENDGRID_API_KEY;
    const sendgridSender = process.env.EMAIL_SENDER;

    console.log("2. Creating session client");
    const { storage, databases } = await createSessionClient();

    console.log("3. Getting env");
    const { databaseId, certificates, certificatesBucket } = getEnv();

    console.log("4. Fetching certificate:", certificateId);
    const res = await getCertificateFiles(
      storage,
      databases,
      databaseId,
      certificates,
      certificateId,
      certificatesBucket,
      format,
    );

    if (!res.ok || !res.data) {
      return { ok: false, error: res.error || "Certificate not found" };
    }

    console.log("5. Certificate fetch result:", res.ok);
    const { fileBuffer, filename } = res.data;

    // 6. Send email
    if (sendgridKey && sendgridSender) {
      console.log("6. Sending email via SendGrid");
      sgMail.setApiKey(sendgridKey);
      await sgMail.send({
        from: sendgridSender,
        to: recipient,
        subject,
        html,
        attachments: [
          {
            content: Buffer.from(fileBuffer).toString("base64"),
            filename,
            type: format === "pdf" ? "application/pdf" : "image/png",
            disposition: "attachment",
          },
        ],
      });
    } else {
      console.log("6. Sending email via SMTP");
      const smtp = getSMTPEnv();
      const port = Number.parseInt(String(smtp.port), 10);
      const enc = String(smtp.encryption || "").toLowerCase();
      const secure = enc === "ssl" || enc === "smtps" || port === 465;

      const transport = nodemailer.createTransport({
        host: smtp.hostname,
        port,
        secure,
        auth: {
          user: smtp.username,
          pass: smtp.password,
        },
        ...(enc === "tls" || enc === "starttls" ? { requireTLS: true } : {}),
      });

      await transport.sendMail({
        from: smtp.sender,
        to: recipient,
        subject,
        html,
        attachments: [
          {
            filename,
            content: Buffer.from(fileBuffer),
            contentType: format === "pdf" ? "application/pdf" : "image/png",
          },
        ],
      });
    }

    return { ok: true };
  } catch (err: any) {
    // Provide a clearer message when email env vars are missing.
    const msg = err?.message ?? "Failed to send email";
    if (msg.includes("is not defined")) {
      return {
        ok: false,
        error:
          "Email is not configured. Set either SENDGRID_API_KEY + EMAIL_SENDER, or SMTP_HOST/PORT/USERNAME/PASSWORD/ENCRYPTION/SMTP_SENDER_EMAIL.",
      };
    }
    return { ok: false, error: msg };
  }
}
