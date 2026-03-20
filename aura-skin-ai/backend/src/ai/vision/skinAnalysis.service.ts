import { Injectable } from "@nestjs/common";

export interface SkinFeatureResult {
  skinType?: string;
  concerns?: string[];
  tone?: string;
  raw?: Record<string, unknown>;
}

/**
 * Skin feature detection from validated face images.
 * Combines with questionnaire for full skin profile.
 */
@Injectable()
export class SkinAnalysisService {
  async analyzeFromImages(
    _imageBuffers: Buffer[],
    _questionnaire?: Record<string, unknown>
  ): Promise<SkinFeatureResult> {
    // Stub: return placeholder; integrate vision model in production
    return {
      skinType: "Combination",
      concerns: [],
      tone: "Medium",
      raw: {},
    };
  }
}
