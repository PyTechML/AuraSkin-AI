import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { InternalApiKeyGuard } from "../../../shared/guards/internal-api-key.guard";
import { EventsService } from "../services/events.service";
import { CreateEventDto } from "../dto/create-event.dto";
import { formatSuccess } from "../../../shared/utils/responseFormatter";

@Controller("internal")
@UseGuards(InternalApiKeyGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post("events")
  async createEvent(@Body() dto: CreateEventDto) {
    const result = await this.eventsService.emit(dto.event_type, dto.payload);
    return formatSuccess(result ?? { eventId: null });
  }
}
