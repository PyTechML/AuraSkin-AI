import { Module } from "@nestjs/common";
import { PaymentsController } from "./controllers/payments.controller";
import { CheckoutController } from "./controllers/checkout.controller";
import { WebhooksController } from "./controllers/webhooks.controller";
import { RefundsController } from "./controllers/refunds.controller";
import { PayoutsController } from "./controllers/payouts.controller";
import { PaymentsService } from "./services/payments.service";
import { CheckoutService } from "./services/checkout.service";
import { WebhooksService } from "./services/webhooks.service";
import { RefundsService } from "./services/refunds.service";
import { PayoutsService } from "./services/payouts.service";
import { PaymentsRepository } from "./repositories/payments.repository";
import { PayoutsRepository } from "./repositories/payouts.repository";
import { RefundsRepository } from "./repositories/refunds.repository";
import { PaymentAuditRepository } from "./repositories/payment-audit.repository";
import { DermatologistModule } from "../partner/dermatologist/dermatologist.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [DermatologistModule, NotificationsModule],
  controllers: [
    PaymentsController,
    CheckoutController,
    WebhooksController,
    RefundsController,
    PayoutsController,
  ],
  providers: [
    PaymentsService,
    CheckoutService,
    WebhooksService,
    RefundsService,
    PayoutsService,
    PaymentsRepository,
    PayoutsRepository,
    RefundsRepository,
    PaymentAuditRepository,
  ],
  exports: [PaymentsService, RefundsService, PaymentsRepository],
})
export class PaymentsModule {}
