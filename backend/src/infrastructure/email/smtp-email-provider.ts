import type { EmailProvider } from "./email-provider.js";
import { env } from "../../config/env.js";

// Minimal SMTP implementation using Node's built-in fetch is not viable for
// SMTP (it's not HTTP), so a real deployment should install `nodemailer`
// and wire it up here. Left as an explicit stub rather than a hidden
// dependency so the project's core (auth/session/RBAC logic) has zero
// coupling to a specific mail library.
export class SmtpEmailProvider implements EmailProvider {
  constructor() {
    if (!env.SMTP_HOST) {
      throw new Error("SMTP_HOST must be configured when EMAIL_PROVIDER=smtp");
    }
  }

  async sendVerificationEmail(_to: string, _verifyUrl: string): Promise<void> {
    throw new Error(
      "SmtpEmailProvider is a stub. Install nodemailer and implement transport.sendMail() here."
    );
  }

  async sendPasswordResetEmail(_to: string, _resetUrl: string): Promise<void> {
    throw new Error(
      "SmtpEmailProvider is a stub. Install nodemailer and implement transport.sendMail() here."
    );
  }

  async sendSecurityNotification(_to: string, _subject: string, _body: string): Promise<void> {
    throw new Error(
      "SmtpEmailProvider is a stub. Install nodemailer and implement transport.sendMail() here."
    );
  }
}
