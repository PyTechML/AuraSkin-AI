import { Controller, Param, Put, UseGuards } from "@nestjs/common";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { AuthGuard } from "../../../shared/guards/auth.guard";
import { RefundsService } from "../../payments/services/refunds.service";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { Throttle } from "@nestjs/throttler";

const RequireAdmin = () => SetMetadata(ROLES_KEY, ["admin"] as BackendRole[]);

@Controller("admin")
@UseGuards(AuthGuard, RoleGuard)
@RequireAdmin()
@Throttle({ payment: { limit: 20, ttl: 60000 } })
export class AdminRefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Put("refunds/:id")
  async approveRefund(@Param("id") id: string) {
    const data = await this.refundsService.approveRefund(id);
    return formatSuccess(data ?? { ok: false });
  }
}
