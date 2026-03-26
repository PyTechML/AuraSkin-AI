/**
 * Validation for assessment image uploads.
 * Allowed: JPG, PNG. Max 5MB per file.
 * Required: 3 angles — front_face, left_profile, right_profile.
 */

export const ASSESSMENT_IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5MB

export const ASSESSMENT_IMAGE_ALLOWED_MIMES = ["image/jpeg", "image/png"] as const;

export type AssessmentImageView =
  | "front_face"
  | "left_profile"
  | "right_profile";

export const ASSESSMENT_IMAGE_VIEWS: AssessmentImageView[] = [
  "front_face",
  "left_profile",
  "right_profile",
];

export function isAllowedMime(mimetype: string): boolean {
  return ASSESSMENT_IMAGE_ALLOWED_MIMES.includes(mimetype as (typeof ASSESSMENT_IMAGE_ALLOWED_MIMES)[number]);
}

export function isAllowedSize(size: number): boolean {
  return size > 0 && size <= ASSESSMENT_IMAGE_MAX_BYTES;
}

export const INVALID_FACE_IMAGE_MESSAGE =
  "Please upload a clear face image.";
