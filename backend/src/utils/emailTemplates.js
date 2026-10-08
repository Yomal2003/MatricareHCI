/**
 * Email Templates
 * Formats responsive HTML and plain-text email templates for staff credential delivery.
 */

/**
 * Builds the credentials onboarding email for newly registered staff.
 *
 * @param {Object} params
 * @param {string} params.fullName - Staff member's full name
 * @param {string} params.username - Auto-generated username (e.g. PHM004)
 * @param {string} params.temporaryPassword - Unhashed temporary password
 * @param {string} [params.role] - Staff role
 * @param {string} [params.zone] - Assigned zone
 * @returns {{ subject: string, html: string, text: string }}
 */
function buildStaffCredentialsEmail({ fullName, username, temporaryPassword, role, zone }) {
  const loginUrl = process.env.APP_LOGIN_URL || "http://localhost:3000/login";
  const appName = "MatriCare — Maternal & Child Health System";

  const subject = `Your MatriCare Staff Account Credentials [${username}]`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MatriCare Staff Credentials</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F8FAFC;
      margin: 0;
      padding: 24px;
      color: #1E293B;
    }
    .email-container {
      max-width: 580px;
      margin: 0 auto;
      background: #FFFFFF;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 4px 14px rgba(0,0,0,0.06);
      border: 1px solid #E2E8F0;
    }
    .header {
      background: linear-gradient(135deg, #7B4FE0 0%, #6B3FD4 100%);
      color: #FFFFFF;
      padding: 32px 28px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 6px 0;
      font-size: 24px;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 0;
      font-size: 14px;
      opacity: 0.9;
    }
    .body-content {
      padding: 32px 28px;
      line-height: 1.6;
    }
    .greeting {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 12px;
      color: #0F172A;
    }
    .card-credentials {
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-left: 5px solid #7B4FE0;
      border-radius: 10px;
      padding: 20px;
      margin: 24px 0;
    }
    .credential-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #E2E8F0;
    }
    .credential-row:last-child {
      border-bottom: none;
    }
    .credential-label {
      font-weight: 600;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748B;
    }
    .credential-value {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 16px;
      font-weight: 700;
      color: #1E293B;
      background: #FFFFFF;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid #E2E8F0;
    }
    .security-notice {
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      color: #92400E;
      padding: 14px 16px;
      border-radius: 8px;
      font-size: 13.5px;
      margin: 20px 0;
    }
    .security-notice strong {
      display: block;
      margin-bottom: 4px;
      font-size: 14px;
    }
    .cta-container {
      text-align: center;
      margin: 32px 0 16px 0;
    }
    .cta-button {
      display: inline-block;
      background: #7B4FE0;
      color: #FFFFFF !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 15px;
      padding: 14px 28px;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(123, 79, 224, 0.35);
    }
    .footer {
      background: #F8FAFC;
      padding: 20px 28px;
      border-top: 1px solid #E2E8F0;
      text-align: center;
      font-size: 12px;
      color: #94A3B8;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>${appName}</h1>
      <p>MOH Office Healthcare Staff Portal</p>
    </div>

    <div class="body-content">
      <div class="greeting">Hello, ${fullName}</div>
      <p>
        An account has been created for you by the Medical Officer of Health (MOH)
        to access the MatriCare healthcare management application.
      </p>

      <div class="card-credentials">
        <div class="credential-row">
          <span class="credential-label">Role:</span>
          <span style="font-weight: 600;">${role || "Healthcare Worker"}</span>
        </div>
        ${zone ? `
        <div class="credential-row">
          <span class="credential-label">Assigned Zone:</span>
          <span style="font-weight: 600;">${zone}</span>
        </div>` : ""}
        <div class="credential-row">
          <span class="credential-label">Username:</span>
          <span class="credential-value">${username}</span>
        </div>
        <div class="credential-row">
          <span class="credential-label">Temporary Password:</span>
          <span class="credential-value">${temporaryPassword}</span>
        </div>
      </div>

      <div class="security-notice">
        <strong>⚠ Action Required on First Login</strong>
        This password is for temporary use only. For security purposes, you will be
        required to set a new password upon logging into the application for the first time.
      </div>

      <div class="cta-container">
        <a href="${loginUrl}" class="cta-button">Log In to MatriCare</a>
      </div>

      <p style="font-size: 13px; color: #64748B; margin-top: 24px;">
        If you did not expect this invitation or believe it was sent by mistake, please contact
        your regional MOH administrator immediately.
      </p>
    </div>

    <div class="footer">
      &copy; ${new Date().getFullYear()} MatriCare. Monaragala District Health Services. All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
Welcome to MatriCare!

Hello ${fullName},

Your healthcare worker account has been created by the MOH office.

Your Login Credentials:
- Username: ${username}
- Temporary Password: ${temporaryPassword}
${role ? `- Role: ${role}\n` : ""}${zone ? `- Assigned Zone: ${zone}\n` : ""}

IMPORTANT SECURITY NOTICE:
You are required to change this temporary password immediately upon your first login.

Log in here: ${loginUrl}

If you have questions, please contact your regional MOH office.
  `.trim();

  return { subject, html, text };
}

module.exports = {
  buildStaffCredentialsEmail,
};
