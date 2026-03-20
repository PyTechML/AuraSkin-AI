import { Controller, Post, Body, Get } from "@nestjs/common";
import { ChatbotService } from "./chatbot.service";

@Controller("assistant")
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post()
  async postMessage(@Body() body: unknown) {
    const payload = body as Parameters<ChatbotService["handleRequest"]>[0];
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
