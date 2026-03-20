import { Injectable } from "@nestjs/common";
import type { ImageValidationResult } from "../../shared/utils/imageValidation";

/**
 * Face detection for assessment images using MediaPipe/OpenCV.
 * Validates: single face, centered, human.
 * Stub implementation; integrate @mediapipe/tasks-vision or opencv4nodejs in production.
 */
@Injectable()
export class FaceDetectionService {
  async validateAssessmentImages(
    _imageBuffers: Array<{ buffer: Buffer; view: "front" | "left" | "right" }>
  ): Promise<ImageValidationResult> {
    // Stub: require 3 images (front, left, right)
    const views = _imageBuffers.map((x) => x.view);
    const hasFront = views.includes("front");
    const hasLeft = views.includes("left");
    const hasRight = views.includes("right");
    if (!hasFront || !hasLeft || !hasRight) {
      return {
        valid: false,
        code: "MISSING_VIEWS",
        message: "Required: 1 front view and 2 side views (left, right).",
      };
    }
    // TODO: run MediaPipe face detection on each image; reject NO_FACE, MULTIPLE_FACES, NOT_CENTERED, NOT_HUMAN
    return {
      valid: true,
      message: "Images validated.",
    };
  }
}
