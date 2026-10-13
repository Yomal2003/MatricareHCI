/**
 * Mailer Configuration
 * Configures Nodemailer with Gmail SMTP and exports a safe sending utility.
 */

const nodemailer = require("nodemailer");
require("dotenv").config();

// Create Nodemailer transporter supporting Brevo or Gmail SMTP
function createTransporter() {
  const isExplicitGmail = process.env.EMAIL_PROVIDER === "gmail";
  const hasGmailCreds = Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
  const hasBrevo = Boolean(process.env.BREVO_SMTP_KEY || (process.env.SMTP_HOST && process.env.SMTP_HOST !== "localhost"));

  // Option A: Gmail SMTP (if requested or if Gmail creds configured without Brevo)
  if (isExplicitGmail || (hasGmailCreds && !hasBrevo)) {
    return nodemailer.createTransport({
      service: "gmail",
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  // Option B: Brevo (or custom SMTP provider)
  if (hasBrevo) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
      auth: {
        user: process.env.SMTP_USER || process.env.BREVO_USER || process.env.GMAIL_USER,
        pass: process.env.BREVO_SMTP_KEY || process.env.SMTP_PASS,
      },
    });
  }

  // Fallback: Gmail if any credentials exist
  if (hasGmailCreds) {
    return nodemailer.createTransport({
      service: "gmail",
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  // No provider configured: fallback to unauthenticated local
  return nodemailer.createTransport({
    host: "localhost",
    port: 25,
  });
}

const transporter = createTransporter();

/**
 * Verify transporter configuration on startup (optional helper).
 */
async function verifyTransporter() {
  const isExplicitGmail = process.env.EMAIL_PROVIDER === "gmail";
  const hasGmailCreds = Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
  const hasBrevo = Boolean(process.env.BREVO_SMTP_KEY || (process.env.SMTP_HOST && process.env.SMTP_HOST !== "localhost"));

  if (!hasBrevo && !hasGmailCreds) {
    console.warn("⚠ No email provider configured (Gmail or Brevo). Outgoing emails will fail.");
    return false;
  }
  try {
    await transporter.verify();
    const providerName = isExplicitGmail || (!hasBrevo && hasGmailCreds) ? "Gmail SMTP" : "Brevo SMTP";
    console.log(`✔ ${providerName} Transporter verified and ready to send messages.`);
    return true;
  } catch (err) {
    console.warn("⚠ SMTP verification warning:", err.message);
    return false;
  }
}

/**
 * Send an email safely with try/catch wrapping.
 * Failure does NOT crash the application, but returns an error status
 * so the calling controller can update emailStatus to 'failed'.
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.html - HTML body
 * @param {string} [options.text] - Plain text fallback body
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
async function sendEmail({ to, subject, html, text }) {
  try {
    const fromAddress =
      process.env.EMAIL_FROM ||
      `"MatriCare MOH Office" <${process.env.BREVO_USER || process.env.GMAIL_USER || "no-reply@matricare.health.gov.lk"}>`;

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text: text || "Your MatriCare portal credentials have been generated.",
      html,
    });

    console.log(`✔ Email delivered to ${to} (MessageID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Email delivery failed to ${to}:`, error.message, error.response || "");
    return { success: false, error: error.message };
  }
}

module.exports = {
  transporter,
  verifyTransporter,
  sendEmail,
};
