import { BadRequestException, Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../database/supabase.client";

export interface UploadResult {
  key: string;
  path: string;
  url?: string;
}

/**
 * Temporary or persistent image upload to Supabase Storage.
 * Used for assessment images before validation and pipeline.
 */
@Injectable()
export class ImageUploadService {
  private readonly bucket = "assessment-images";
  private bucketEnsured = false;

  /** Create the assessment-images bucket if it does not exist (idempotent). */
  private async ensureBucketExists(): Promise<void> {
    if (this.bucketEnsured) return;
    const supabase = getSupabaseClient();
    const { error } = await supabase.storage.createBucket(this.bucket, {
      public: true,
      fileSizeLimit: 5242880, // 5MB
    });
    if (error) {
      const msg = String(error.message || "").toLowerCase();
      if (msg.includes("already exists") || msg.includes("duplicate") || msg.includes("bucket")) {
        this.bucketEnsured = true;
        return;
      }
    } else {
      this.bucketEnsured = true;
    }
  }

  async uploadTemp(
    userId: string,
    assessmentId: string,
    view: string,
    buffer: Buffer,
    contentType: string
  ): Promise<UploadResult> {
    await this.ensureBucketExists();
    const supabase = getSupabaseClient();
    const ext = contentType.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "jpg";
    const key = `${userId}/${assessmentId}/${view}-${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage
      .from(this.bucket)
      .upload(key, buffer, {
        contentType,
        upsert: false,
      });
    if (error || !data) {
      const message =
        (error?.message && String(error.message).trim()) || "Image upload failed. Please try again.";
      throw new BadRequestException(message);
    }
    const { data: urlData } = supabase.storage.from(this.bucket).getPublicUrl(data.path);
    return {
      key: data.path,
      path: data.path,
      url: urlData.publicUrl,
    };
  }

  async getBuffer(bucket: string, path: string): Promise<Buffer> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error || !data) {
      throw new BadRequestException(error?.message ?? "Download failed");
    }
    return Buffer.from(await data.arrayBuffer());
  }

  /**
   * Create a signed URL for a storage object. pathOrUrl can be the storage path
   * (e.g. "userId/assessmentId/view.jpg") or a full public URL from which path is extracted.
   */
  async getSignedUrl(pathOrUrl: string, expiresInSeconds = 3600): Promise<string | null> {
    const supabase = getSupabaseClient();
    const path = this.extractStoragePath(pathOrUrl);
    if (!path) return null;
    const { data, error } = await supabase.storage
      .from(this.bucket)
      .createSignedUrl(path, expiresInSeconds);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  }

  /** Extract storage object path from full URL or return as-is if already a path. */
  private extractStoragePath(pathOrUrl: string): string | null {
    if (!pathOrUrl || !pathOrUrl.startsWith("http")) return pathOrUrl || null;
    const prefix = `/object/public/${this.bucket}/`;
    const i = pathOrUrl.indexOf(prefix);
    if (i === -1) return null;
    return pathOrUrl.slice(i + prefix.length);
  }
}
