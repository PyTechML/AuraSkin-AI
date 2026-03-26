import { Controller, Post, Body, Get, UseGuards, Req, SetMetadata } from "@nestjs/common";
import type { Request } from "express";
import { ChatbotService } from "./chatbot.service";
import { AuthGuard, type AuthenticatedUser } from "../../shared/guards/auth.guard";
import { RoleGuard, ROLES_KEY } from "../../shared/guards/role.guard";
import type { BackendRole } from "../../shared/constants/roles";

const RequireAssistantRole = () =>
  SetMetadata(ROLES_KEY, ["user", "admin", "store", "dermatologist"] as BackendRole[]);

function toFrontendRole(role: BackendRole): "USER" | "ADMIN" | "STORE" | "DERMATOLOGIST" {
  if (role === "admin") return "ADMIN";
  if (role === "store") return "STORE";
  if (role === "dermatologist") return "DERMATOLOGIST";
  return "USER";
}

@Controller("assistant")
@UseGuards(AuthGuard, RoleGuard)
@RequireAssistantRole()
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post()
  async postMessage(@Req() req: Request, @Body() body: unknown) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const payload = body as Parameters<ChatbotService["handleRequest"]>[0];
    if (user?.id) payload.userId = user.id;
    if (user?.email) payload.userEmail = user.email;
    if (user?.role) payload.role = toFrontendRole(user.role);
    return this.chatbotService.handleRequest(payload);
  }

  @Get("usage")
  getUsage() {
    return {
      totalQueries: 0,
      queriesByPanel: { user: 0, admin: 0, store: 0, dermatologist: 0 },
      tokensUsedTotalApprox: 0,
      dailyQueries: {} as Record<string, number>,
    };
  }

  @Get("settings")
  getSettings() {
    return {
      enabled: true,
      enabledForRole: { USER: true, ADMIN: true, STORE: true, DERMATOLOGIST: true },
      allowedTopics: [],
      systemPrompt: "You are the AuraSkin in-app assistant.",
    };
  }

  @Post("settings")
  updateSettings(@Body() _body: unknown) {
    return { success: true };
  }
}
