import { Module } from "@nestjs/common";
import { PublicController } from "./public.controller";
import { PublicService } from "./public.service";
import { PublicRepository } from "./public.repository";

@Module({
  controllers: [PublicController],
  providers: [PublicRepository, PublicService],
  exports: [PublicService],
})
export class PublicModule {}
