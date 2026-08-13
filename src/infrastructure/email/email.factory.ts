import type { EmailProvider } from "./email-provider.js";
import { ConsoleEmailProvider } from "./console-email-provider.js";
import { SmtpEmailProvider } from "./smtp-email-provider.js";
import { env } from "../../config/env.js";

let instance: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (!instance) {
    instance = env.EMAIL_PROVIDER === "smtp" ? new SmtpEmailProvider() : new ConsoleEmailProvider();
  }
  return instance;
}
