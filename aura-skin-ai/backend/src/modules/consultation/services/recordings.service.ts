import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { ConsultationRepository } from "../repositories/consultation.repository";
import { RecordingsRepository } from "../repositories/recordings.repository";
import { RecordingStorageService } from "./recording-storage.service";
import type { DbConsultationRecording } from "../../../database/models";

export interface RecordingWithSignedUrl extends Omit<DbConsultationRecording, "recording_url"> {
  recording_url: string;
  signed_url: string | null;
}

@Injectable()
export class RecordingsService {
  constructor(
    private readonly consultationRepository: ConsultationRepository,
    private readonly recordingsRepository: RecordingsRepository,
    private readonly recordingStorage: RecordingStorageService
  ) {}

  async assertOwnership(consultationId: string, userId: string, role: string): Promise<void> {
    const consultation = await this.consultationRepository.findById(consultationId);
    if (!consultation)
      throw new BadRequestException("Consultation not found");
    const isUser = consultation.user_id === userId;
    const isDermatologist = consultation.dermatologist_id === userId;
    const isAdmin = role === "admin";
    if (!isUser && !isDermatologist && !isAdmin)
      throw new ForbiddenException("Not authorized for this consultation");
  }

  async getUploadUrl(
    consultationId: string,
    userId: string,
    role: string
  ): Promise<{ path: string; token: string; recording_id: string }> {
    await this.assertOwnership(consultationId, userId, role);
    const { randomUUID } = await import("crypto");
    const recordingId = randomUUID();
    const { path, token } = await this.recordingStorage.createSignedUploadUrl(
      consultationId,
      recordingId
    );
    return { path, token, recording_id: recordingId };
  }

  async saveRecording(
    consultationId: string,
    pathOrUrl: string,
    durationSeconds: number | null,
    userId: string,
    role: string
  ): Promise<DbConsultationRecording | null> {
    await this.assertOwnership(consultationId, userId, role);
    return this.recordingsRepository.create({
      consultation_id: consultationId,
      recording_url: pathOrUrl,
      duration: durationSeconds ?? null,
    });
  }

  async listRecordings(
    consultationId: string,
    userId: string,
    role: string
  ): Promise<RecordingWithSignedUrl[]> {
    await this.assertOwnership(consultationId, userId, role);
    const list = await this.recordingsRepository.findByConsultationId(consultationId);
    const out: RecordingWithSignedUrl[] = [];
    for (const r of list) {
      const signedUrl = await this.recordingStorage.createSignedUrl(r.recording_url);
      out.push({ ...r, signed_url: signedUrl ?? null });
    }
    return out;
  }
}
