import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";

const BUCKET = "consultation-recordings";
const SIGNED_URL_EXPIRY_SECONDS = 3600;

@Injectable()
export class RecordingStorageService {
  async createSignedUploadUrl(
    consultationId: string,
    recordingId: string
  ): Promise<{ path: string; token: string }> {
    const supabase = getSupabaseClient();
    const path = `${consultationId}/${recordingId}.webm`;
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(path, { upsert: false });
    if (error) throw new Error(error.message);
    const out = data as { path: string; token: string };
    return { path: out.path, token: out.token };
  }

  async createSignedUrl(path: string, expiresInSeconds = SIGNED_URL_EXPIRY_SECONDS): Promise<string | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, expiresInSeconds);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  }
}
