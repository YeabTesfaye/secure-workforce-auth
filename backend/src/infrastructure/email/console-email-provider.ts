import type { EmailProvider } from "./email-provider.js";

// Logs emails to stdout instead of sending them. Used in development and
// tests so the full registration/reset flow is exercisable without any
// external email dependency.
export class ConsoleEmailProvider implements EmailProvider {
  async sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
    console.log(`\n[EMAIL] Verification email to ${to}\nLink: ${verifyUrl}\n`);
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    console.log(`\n[EMAIL] Password reset email to ${to}\nLink: ${resetUrl}\n`);
  }

  async sendSecurityNotification(to: string, subject: string, body: string): Promise<void> {
    console.log(`\n[EMAIL] Security notification to ${to}\nSubject: ${subject}\n${body}\n`);
  }
}
