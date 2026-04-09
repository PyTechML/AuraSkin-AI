import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

@Injectable()
export class EmailService {
  private resend: Resend | null = null;
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  private getResend(): Resend | null {
    if (this.resend) return this.resend;

    const apiKey = this.configService.get<string>("RESEND_API_KEY");
    if (!apiKey) {
      this.logger.error("EMAIL_DISABLED: RESEND_API_KEY is missing");
      return null;
    }

    try {
      this.resend = new Resend(apiKey);
      return this.resend;
    } catch (err) {
      this.logger.error(`FAILED_TO_INIT_RESEND: ${String(err)}`);
      return null;
    }
  }

  /**
   * Sends an email using Resend.
   * This method is "safe" - it never throws, only logs failures.
   */
  async sendEmailSafe(to: string, subject: string, html: string): Promise<void> {
    const resend = this.getResend();
    if (!resend) {
      this.logger.warn(`EMAIL_SKIPPED: Provider not initialized for ${to}`);
      return;
    }

    const from = this.configService.get<string>("EMAIL_FROM") || "onboarding@resend.dev";

    // Run async-safe
    void (async () => {
      try {
        const { data, error } = await resend.emails.send({
          from,
          to,
          subject,
          html,
        });

        if (error) {
          this.logger.error(`INVOICE_EMAIL_FAILED: ${error.message}`, { email: to });
        } else {
          this.logger.log(`INVOICE_EMAIL_SENT: ${data?.id} to ${to}`);
        }
      } catch (err) {
        this.logger.error(`INVOICE_EMAIL_FAILED_EXCEPTION: ${String(err)}`, { email: to });
      }
    })();
  }
}
