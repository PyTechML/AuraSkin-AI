import { Module } from "@nestjs/common";
import { DermatologistController } from "./dermatologist.controller";
import { SlotsController } from "./slots.controller";
import { ConsultationsController } from "./consultations.controller";
import { PrescriptionsController } from "./prescriptions.controller";
import { EarningsController } from "./earnings.controller";
import { DermatologistService } from "./services/dermatologist.service";
import { SlotsService } from "./services/slots.service";
import { ConsultationsService } from "./services/consultations.service";
import { PrescriptionsService } from "./services/prescriptions.service";
import { EarningsService } from "./services/earnings.service";
import { DermatologistRepository } from "./repositories/dermatologist.repository";
import { SlotsRepository } from "./repositories/slots.repository";
import { ConsultationsRepository } from "./repositories/consultations.repository";
import { PrescriptionsRepository } from "./repositories/prescriptions.repository";
import { EarningsRepository } from "./repositories/earnings.repository";

@Module({
  controllers: [
    DermatologistController,
    SlotsController,
    ConsultationsController,
    PrescriptionsController,
    EarningsController,
  ],
  providers: [
    DermatologistService,
    SlotsService,
    ConsultationsService,
    PrescriptionsService,
    EarningsService,
    DermatologistRepository,
    SlotsRepository,
    ConsultationsRepository,
    PrescriptionsRepository,
    EarningsRepository,
  ],
  exports: [DermatologistService, EarningsRepository],
})
export class DermatologistModule {}
