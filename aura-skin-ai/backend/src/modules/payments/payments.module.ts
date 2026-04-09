import { Module, forwardRef } from "@nestjs/common";
import { PaymentsController } from "./controllers/payments.controller";
import { CheckoutController } from "./controllers/checkout.controller";
import { WebhooksController } from "./controllers/webhooks.controller";
import { RefundsController } from "./controllers/refunds.controller";
import { PayoutsController } from "./controllers/payouts.controller";
import { ConsultationPaymentController } from "./controllers/consultation-payment.controller";
import { PaymentsService } from "./services/payments.service";
import { CheckoutService } from "./services/checkout.service";
import { WebhooksService } from "./services/webhooks.service";
import { RefundsService } from "./services/refunds.service";
import { PayoutsService } from "./services/payouts.service";
import { ConsultationPaymentService } from "./services/consultation-payment.service";
import { PaymentsRepository } from "./repositories/payments.repository";
import { PayoutsRepository } from "./repositories/payouts.repository";
import { RefundsRepository } from "./repositories/refunds.repository";
import { PaymentAuditRepository } from "./repositories/payment-audit.repository";
import { StripeService } from "./services/stripe.service";
import { InvoiceEmailService } from "./services/invoice-email.service";
import { DermatologistModule } from "../partner/dermatologist/dermatologist.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { EmailModule } from "../email/email.module";

@Module({
  imports: [DermatologistModule, NotificationsModule, EmailModule],
  controllers: [
    PaymentsController,
    CheckoutController,
    WebhooksController,
    RefundsController,
    PayoutsController,
    ConsultationPaymentController,
  ],
  providers: [
    StripeService,
    PaymentsService,
    CheckoutService,
    WebhooksService,
    RefundsService,
    PayoutsService,
    ConsultationPaymentService,
    PaymentsRepository,
    PayoutsRepository,
    RefundsRepository,
    PaymentAuditRepository,
    InvoiceEmailService,
  ],
  exports: [PaymentsService, RefundsService, PaymentsRepository, StripeService, ConsultationPaymentService],
})
export class PaymentsModule {}
