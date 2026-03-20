import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard, AuthenticatedUser } from "../../../shared/guards/auth.guard";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { MessagesService } from "../services/messages.service";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { CreateMessageDto } from "../dto/message.dto";

const RequireUserOrDermatologist = () =>
  SetMetadata(ROLES_KEY, ["user", "dermatologist"] as BackendRole[]);

@Controller("consultation")
@UseGuards(AuthGuard, RoleGuard)
@RequireUserOrDermatologist()
@Throttle({ consultation: { limit: 30, ttl: 60_000 } })
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post("messages")
  async createMessage(@Req() req: Request, @Body() dto: CreateMessageDto) {
    const user = (req as Request & { user?: AuthenticatedUser }).user!;
    const data = await this.messagesService.addMessage(
      dto.consultation_id,
      user.id,
      dto.message
    );
    return formatSuccess(data);
  }

  @Get("messages/:consultationId")
  async getMessages(
    @Req() req: Request,
    @Param("consultationId") consultationId: string
  ) {
    const user = (req as Request & { user?: AuthenticatedUser }).user!;
    const data = await this.messagesService.getMessages(
      consultationId,
      user.id
    );
    return formatSuccess(data);
  }
}
