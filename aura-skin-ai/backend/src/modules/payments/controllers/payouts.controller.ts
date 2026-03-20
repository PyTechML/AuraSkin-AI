import { Controller, Param, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard } from "../../../shared/guards/auth.guard";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { PayoutsService } from "../services/payouts.service";
import { formatSuccess } from "../../../shared/utils/responseFormatter";

const RequireAdmin = () => SetMetadata(ROLES_KEY, ["admin"] as BackendRole[]);

@Controller("payments")
@UseGuards(AuthGuard, RoleGuard)
@RequireAdmin()
@Throttle({ payment: { limit: 20, ttl: 60000 } })
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Post("payout/store/:storeId")
  async triggerStorePayout(@Param("storeId") storeId: string) {
    const data = await this.payoutsService.triggerStorePayout(storeId);
    return formatSuccess(data ?? { ok: false });
  }
}
