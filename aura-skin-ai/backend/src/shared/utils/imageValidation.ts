/**
 * High-level image validation interface for assessment uploads.
 * Delegates to ai/vision for actual face detection.
 */

export type ImageValidationCode =
  | "NO_FACE"
  | "MULTIPLE_FACES"
  | "NOT_CENTERED"
  | "NOT_HUMAN"
  | "MISSING_VIEWS"
  | "INVALID_FORMAT";

export interface ImageValidationResult {
  valid: boolean;
  code?: ImageValidationCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface AssessmentImageRequirement {
  view: "front" | "left" | "right";
  required: boolean;
}

export const ASSESSMENT_IMAGE_REQUIREMENTS: AssessmentImageRequirement[] = [
  { view: "front", required: true },
  { view: "left", required: true },
  { view: "right", required: true },
];
