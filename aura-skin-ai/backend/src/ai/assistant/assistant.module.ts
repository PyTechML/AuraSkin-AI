import { Module } from "@nestjs/common";
import { AiEngineGuardService } from "../guard/ai-engine-guard.service";
import { ChatbotController } from "./chatbot.controller";
import { ChatbotService } from "./chatbot.service";

@Module({
  controllers: [ChatbotController],
  providers: [ChatbotService, AiEngineGuardService],
  exports: [ChatbotService],
})
export class AssistantModule {}
