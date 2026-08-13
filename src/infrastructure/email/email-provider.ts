// The auth system depends on this interface only, never on a concrete
// provider. Swapping ConsoleEmailProvider for an SMTP/SES/Postmark provider
// in production is a one-line change in email.factory.ts.
export interface EmailProvider {
  sendVerificationEmail(to: string, verifyUrl: string): Promise<void>;
  sendPasswordResetEmail(to: string, resetUrl: string): Promise<void>;
  sendSecurityNotification(to: string, subject: string, body: string): Promise<void>;
}
