import { Injectable } from "@nestjs/common";
import type { EarningsAggregate } from "../repositories/earnings.repository";
import { EarningsRepository } from "../repositories/earnings.repository";

@Injectable()
export class EarningsService {
  constructor(private readonly earningsRepository: EarningsRepository) {}

  async getAggregate(dermatologistId: string): Promise<EarningsAggregate> {
    return this.earningsRepository.getAggregateByDermatologistId(
      dermatologistId
    );
  }
}
