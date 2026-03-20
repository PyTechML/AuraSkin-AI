import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { ConsultationRepository } from "../repositories/consultation.repository";
import { MessagesRepository } from "../repositories/messages.repository";
import type { DbConsultationMessage } from "../../../database/models";

@Injectable()
export class MessagesService {
  constructor(
    private readonly consultationRepository: ConsultationRepository,
    private readonly messagesRepository: MessagesRepository
  ) {}

  async assertOwnership(consultationId: string, userId: string): Promise<void> {
    const consultation = await this.consultationRepository.findById(
      consultationId
    );
    if (!consultation)
      throw new BadRequestException("Consultation not found");
    const isUser = consultation.user_id === userId;
    const isDermatologist = consultation.dermatologist_id === userId;
    if (!isUser && !isDermatologist)
      throw new ForbiddenException("Not authorized for this consultation");
  }

  async addMessage(
    consultationId: string,
    senderId: string,
    message: string
  ): Promise<DbConsultationMessage | null> {
    await this.assertOwnership(consultationId, senderId);
    return this.messagesRepository.create({
      consultation_id: consultationId,
      sender_id: senderId,
      message,
    });
  }

  async getMessages(
    consultationId: string,
    userId: string
  ): Promise<DbConsultationMessage[]> {
    await this.assertOwnership(consultationId, userId);
    return this.messagesRepository.findByConsultationId(consultationId);
  }
}
