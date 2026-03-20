/**
 * MediaPipe face detection engine.
 * Stub for integration; use @mediapipe/tasks-vision or similar in production.
 */

export interface FaceDetectionResult {
  faceCount: number;
  isCentered: boolean;
  confidence: number;
}

export function detectFaces(_imageBuffer: Buffer): Promise<FaceDetectionResult> {
  return Promise.resolve({
    faceCount: 1,
    isCentered: true,
    confidence: 1,
  });
}
