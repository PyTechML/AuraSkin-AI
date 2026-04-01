"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAssessmentStore } from "@/store/assessmentStore";
import type { AssessmentStepData } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Check, ChevronLeft, ChevronRight } from "lucide-react";

const CONCERN_OPTIONS = ["Acne", "Dryness", "Oiliness", "Hyperpigmentation", "Fine lines", "Sensitivity", "Redness", "Dullness"];
const SKIN_TYPES = ["Dry", "Oily", "Combination", "Normal", "Sensitive"];
const SKIN_TONES = ["Fair", "Light", "Medium", "Tan", "Deep", "Dark"];

const IMAGE_VIEWS: { key: string; label: string }[] = [
  { key: "front_face", label: "Front face" },
  { key: "left_profile", label: "Left profile" },
  { key: "right_profile", label: "Right profile" },
];

/** MediaPipe Face Mesh indices (tfjs): 33 = subject's right-eye contour, 263 = subject's left-eye contour (image x: min ≈ subject right, max ≈ subject left). */
const MESH_NOSE_TIP = 1;
const MESH_EYE_SUBJECT_RIGHT = 33;
const MESH_EYE_SUBJECT_LEFT = 263;

const MIN_EYE_SPAN_PX = 8;
/** Consecutive matching frames before arming the 900ms shutter. */
const STABLE_FRAMES_FOR_CAPTURE = 12;
/** Status switches to “hold still” partway through stabilization. */
const STABLE_FRAMES_HOLD_STILL_HINT = 6;

/**
 * Relaxed bands so real head poses still count; nose x projected onto [eyeMinX, eyeMaxX] → ~0.5 front.
 * Left profile: user turns their head right (left cheek toward camera) → yawT decreases.
 */
const POSE_FRONT_MIN = 0.38;
const POSE_FRONT_MAX = 0.62;
const POSE_LEFT_MAX = 0.36;
const POSE_RIGHT_MIN = 0.64;

type LandmarkLike = { x: number; y: number; z?: number };

function computeHorizontalYawT(
  nose: LandmarkLike,
  eyeSubjectRight: LandmarkLike,
  eyeSubjectLeft: LandmarkLike
): number | null {
  const eyeMinX = Math.min(eyeSubjectRight.x, eyeSubjectLeft.x);
  const eyeMaxX = Math.max(eyeSubjectRight.x, eyeSubjectLeft.x);
  const span = eyeMaxX - eyeMinX;
  if (span < MIN_EYE_SPAN_PX) return null;
  return (nose.x - eyeMinX) / span;
}

function poseMatchesTarget(viewKey: string, yawT: number): boolean {
  if (viewKey === "front_face") return yawT > POSE_FRONT_MIN && yawT < POSE_FRONT_MAX;
  if (viewKey === "left_profile") return yawT < POSE_LEFT_MAX;
  if (viewKey === "right_profile") return yawT > POSE_RIGHT_MIN;
  return false;
}

const POSE_SAVED_LABELS: Record<string, string> = {
  front_face: "Front angle saved",
  left_profile: "Left profile saved",
  right_profile: "Right profile saved",
};

/** In-circle titles match nose/eye ratio logic: left profile = turn head right; right profile = turn head left. */
const PHASE_GUIDE: Record<string, { title: string; subtitle: string }> = {
  front_face: {
    title: "Look straight",
    subtitle: "Center your face — hold still when aligned",
  },
  left_profile: {
    title: "Turn right",
    subtitle: "Show your left profile to the camera",
  },
  right_profile: {
    title: "Turn left",
    subtitle: "Show your right profile to the camera",
  },
};

const stepConfig = [
  {
    key: "personalDetails" as const,
    title: "Personal Details",
    schema: z.object({
      fullName: z.string().min(1, "Name is required"),
      age: z.coerce.number().min(1).max(120),
      gender: z.string().optional(),
    }),
  },
  {
    key: "skinTypeTone" as const,
    title: "Skin Type & Tone",
    schema: z.object({
      skinType: z.string().min(1, "Select skin type"),
      skinTone: z.string().min(1, "Select skin tone"),
    }),
  },
  {
    key: "skinConcerns" as const,
    title: "Skin Concerns",
    schema: z.object({
      concerns: z.array(z.string()).min(1, "Select at least one concern"),
    }),
  },
  {
    key: "lifestyle" as const,
    title: "Lifestyle",
    schema: z.object({
      sunExposure: z.string().min(1, "Select sun exposure"),
      sleepHours: z.coerce.number().optional(),
      diet: z.string().optional(),
      stressLevel: z.string().optional(),
    }),
  },
  {
    key: "medicalBackground" as const,
    title: "Medical Background",
    schema: z.object({
      conditions: z.array(z.string()),
      medications: z.array(z.string()),
      allergies: z.string().optional(),
    }),
  },
  {
    key: "imageUpload" as const,
    title: "Image Upload",
    schema: z.object({
      fileNames: z.array(z.string()).length(3, "Capture all 3 face angles"),
    }),
  },
];

function getDefaultValues(stepKey: string, data: AssessmentStepData, fileNames: string[]) {
  const d = data[stepKey as keyof AssessmentStepData];
  if (stepKey === "personalDetails" && d) return d;
  if (stepKey === "skinTypeTone" && d) return d;
  if (stepKey === "skinConcerns") return { concerns: data.skinConcerns ?? [] };
  if (stepKey === "lifestyle" && d) return d;
  if (stepKey === "medicalBackground") {
    const mb = data.medicalBackground;
    return {
      conditions: mb?.conditions ?? [],
      medications: mb?.medications ?? [],
      allergies: mb?.allergies ?? "",
    };
  }
  if (stepKey === "imageUpload") return { fileNames };
  return {};
}

type StepConfigItem = (typeof stepConfig)[number];

interface StepFormProps {
  step: StepConfigItem;
  data: AssessmentStepData;
  fileNames: string[];
  setFileNames: Dispatch<SetStateAction<string[]>>;
  files: File[];
  setFiles: Dispatch<SetStateAction<File[]>>;
  onSuccess: (values: unknown) => void;
  onBack?: () => void;
  /** Step 6: skip live capture (questionnaire-only path). */
  onContinueWithoutScan?: () => void;
  showQuestionnaireSkip?: boolean;
}

type CameraState = "idle" | "starting" | "active" | "denied" | "unsupported" | "error";

function dataUrlToFile(dataUrl: string, fileName: string): File | null {
  const parts = dataUrl.split(",");
  if (parts.length < 2) return null;
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch?.[1] ?? "image/jpeg";
  try {
    const binary = atob(parts[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], fileName, { type: mime });
  } catch {
    return null;
  }
}

function StepForm({
  step,
  data,
  fileNames,
  setFileNames,
  files,
  setFiles,
  onSuccess,
  onBack,
  onContinueWithoutScan,
  showQuestionnaireSkip,
}: StepFormProps) {
  type StepValues = z.infer<typeof step.schema>;
  const form = useForm<StepValues>({
    resolver: zodResolver(step.schema),
    defaultValues: getDefaultValues(step.key, data, fileNames) as StepValues,
    mode: "onChange",
    reValidateMode: "onChange",
  });
  const err = (name: string) => (form.formState.errors as Record<string, { message?: string }>)[name]?.message;
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [captureIndex, setCaptureIndex] = useState(0);
  const [statusMsg, setStatusMsg] = useState("Initializing detector...");
  /** In-circle error hint while camera active (RAF loop updates; avoids stale closure). */
  const [circleError, setCircleError] = useState<"none" | "no_face" | "multi">("none");
  /** Brief per-pose success overlay index, or null. */
  const [poseSuccessFlashIndex, setPoseSuccessFlashIndex] = useState<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<any>(null);
  const detectionLoopActiveRef = useRef(false);
  /** RAF loop reads these on every frame — state alone stays stale inside `run` (single closure). */
  const captureIndexRef = useRef(0);
  const isCapturingRef = useRef(false);
  const requestRef = useRef<number | null>(null);
  const pendingCaptureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const invalidTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const poseFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stablePoseFramesRef = useRef(0);
  const lastEstimateErrorLogAtRef = useRef(0);

  useEffect(() => {
    let active = true;
    async function loadDetector() {
      try {
        await import("@tensorflow/tfjs-core");
        await import("@tensorflow/tfjs-backend-webgl");
        const faceLandmarksDetection = await import("@tensorflow-models/face-landmarks-detection");
        const detector = await faceLandmarksDetection.createDetector(
          faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
          {
            runtime: "tfjs",
            refineLandmarks: true,
            maxFaces: 2, // Detect multiples to show error
          }
        );
        if (active) {
          detectorRef.current = detector;
          setStatusMsg("Ready to scan");
        }
      } catch (e) {
        console.error("Detector load failed", e);
        if (active) setStatusMsg("Detector load failed");
      }
    }
    if (step.key === "imageUpload") {
      loadDetector();
    }
    return () => {
      active = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (pendingCaptureTimeoutRef.current) clearTimeout(pendingCaptureTimeoutRef.current);
      if (invalidTimeoutRef.current) clearTimeout(invalidTimeoutRef.current);
      if (poseFlashTimeoutRef.current) clearTimeout(poseFlashTimeoutRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [step.key]);

  const clearInvalidTimeout = () => {
    if (invalidTimeoutRef.current) clearTimeout(invalidTimeoutRef.current);
    invalidTimeoutRef.current = null;
  };

  /**
   * ~60s from last progress (valid pose / capture); re-armed so users can reposition.
   * After each successful capture, `captureCurrentFrame` calls this again — fresh ~60s for the next angle.
   */
  const armInvalidTimeout = () => {
    clearInvalidTimeout();
    invalidTimeoutRef.current = setTimeout(() => {
      setStatusMsg("Timed out — please ensure your face is visible and try again.");
      setCameraError("Timed out after 60 seconds. Please try again.");
      stopCamera();
    }, 60_000);
  };

  const clearPendingAutoCapture = () => {
    if (pendingCaptureTimeoutRef.current) clearTimeout(pendingCaptureTimeoutRef.current);
    pendingCaptureTimeoutRef.current = null;
    isCapturingRef.current = false;
  };

  const triggerPoseSuccessFlash = (idx: number) => {
    setPoseSuccessFlashIndex(idx);
    if (poseFlashTimeoutRef.current) clearTimeout(poseFlashTimeoutRef.current);
    poseFlashTimeoutRef.current = setTimeout(() => {
      setPoseSuccessFlashIndex(null);
      poseFlashTimeoutRef.current = null;
    }, 1350);
  };

  const startCamera = async () => {
    if (step.key !== "imageUpload") return;
    setCameraError(null);
    setCircleError("none");
    setCameraState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraState("active");
        detectionLoopActiveRef.current = true;
        stablePoseFramesRef.current = 0;
        armInvalidTimeout();
        startDetectionLoop();
      }
    } catch (error) {
      setCameraState("error");
      setCameraError("Unable to start camera. Please ensure permissions are granted.");
    }
  };

  const startDetectionLoop = () => {
    if (!detectorRef.current || !videoRef.current || !detectionLoopActiveRef.current) return;
    const run = async () => {
      try {
        if (!detectionLoopActiveRef.current || !videoRef.current || videoRef.current.paused || videoRef.current.ended) {
          return;
        }

        let faces: { keypoints: LandmarkLike[] }[] = [];
        let estimateFailed = false;
        try {
          faces = await detectorRef.current.estimateFaces(videoRef.current, {
            flipHorizontal: false,
            staticImageMode: false,
          });
        } catch (err) {
          estimateFailed = true;
          const now = Date.now();
          if (now - lastEstimateErrorLogAtRef.current > 5000) {
            lastEstimateErrorLogAtRef.current = now;
            console.error("estimateFaces failed", err);
          }
          stablePoseFramesRef.current = 0;
          setStatusMsg("Brief detection hiccup — stay in frame");
        }

        if (!detectionLoopActiveRef.current || !videoRef.current || videoRef.current.paused || videoRef.current.ended) {
          return;
        }

        if (estimateFailed) {
          return;
        }

        if (faces.length === 0) {
          stablePoseFramesRef.current = 0;
          setCircleError("no_face");
          setStatusMsg("No face detected");
        } else if (faces.length > 1) {
          stablePoseFramesRef.current = 0;
          setCircleError("multi");
          setStatusMsg("Multiple faces detected. Please ensure only you are in frame.");
        } else {
          setCircleError("none");
          const face = faces[0];
          const keypoints = face.keypoints;
          const eyeR = keypoints[MESH_EYE_SUBJECT_RIGHT];
          const eyeL = keypoints[MESH_EYE_SUBJECT_LEFT];
          const nose = keypoints[MESH_NOSE_TIP];

          if (eyeR && eyeL && nose) {
            const yawT = computeHorizontalYawT(nose, eyeR, eyeL);
            const target = IMAGE_VIEWS[captureIndexRef.current];

            if (yawT == null) {
              stablePoseFramesRef.current = 0;
              setStatusMsg("Move a little closer — face too small in frame");
            } else {
              const matches = poseMatchesTarget(target.key, yawT);

              if (!isCapturingRef.current) {
                if (matches) {
                  stablePoseFramesRef.current += 1;
                  armInvalidTimeout();
                } else {
                  stablePoseFramesRef.current = 0;
                }
              }

              const stable = stablePoseFramesRef.current;
              const holdHint = stable >= STABLE_FRAMES_HOLD_STILL_HINT;

              if (!isCapturingRef.current) {
                if (target.key === "front_face") {
                  if (matches && holdHint) setStatusMsg("Front face detected - Hold still...");
                  else if (matches) setStatusMsg("Hold steady — lining up…");
                  else setStatusMsg("Position your face to the center");
                } else if (target.key === "left_profile") {
                  if (matches && holdHint) setStatusMsg("Left profile detected - Hold still...");
                  else if (matches) setStatusMsg("Hold steady — lining up…");
                  else setStatusMsg("Turn your head to the right (left profile)");
                } else if (target.key === "right_profile") {
                  if (matches && holdHint) setStatusMsg("Right profile detected - Hold still...");
                  else if (matches) setStatusMsg("Hold steady — lining up…");
                  else setStatusMsg("Turn your head to the left (right profile)");
                }
              }

              if (
                matches &&
                !isCapturingRef.current &&
                stable >= STABLE_FRAMES_FOR_CAPTURE
              ) {
                armInvalidTimeout();
                if (pendingCaptureTimeoutRef.current) clearTimeout(pendingCaptureTimeoutRef.current);
                pendingCaptureTimeoutRef.current = null;
                isCapturingRef.current = true;
                stablePoseFramesRef.current = 0;
                pendingCaptureTimeoutRef.current = setTimeout(() => {
                  captureCurrentFrame();
                  clearPendingAutoCapture();
                }, 900);
              }
            }
          } else {
            stablePoseFramesRef.current = 0;
          }
        }
      } finally {
        if (detectionLoopActiveRef.current && videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
          requestRef.current = requestAnimationFrame(run);
        }
      }
    };
    requestRef.current = requestAnimationFrame(run);
  };

  const stopCamera = () => {
    detectionLoopActiveRef.current = false;
    stablePoseFramesRef.current = 0;
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    clearPendingAutoCapture();
    clearInvalidTimeout();
    if (poseFlashTimeoutRef.current) clearTimeout(poseFlashTimeoutRef.current);
    poseFlashTimeoutRef.current = null;
    setPoseSuccessFlashIndex(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setCircleError("none");
    setCameraState("idle");
  };

  const captureCurrentFrame = () => {
    const video = videoRef.current;
    const idx = captureIndexRef.current;
    if (!video || idx >= IMAGE_VIEWS.length) return;
    if (video.videoWidth < 32 || video.videoHeight < 32) {
      setStatusMsg("Camera not ready — wait a moment and hold the pose");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg");
    const file = dataUrlToFile(dataUrl, `${IMAGE_VIEWS[idx].key}.jpg`);
    if (file) {
      setFiles((prev) => {
        const next = [...prev];
        next[idx] = file;
        return next;
      });
      setFileNames((prev) => {
        const next = [...prev];
        next[idx] = file.name;
        form.setValue("fileNames", next, { shouldValidate: true });
        return next;
      });
      triggerPoseSuccessFlash(idx);
      if (idx < IMAGE_VIEWS.length - 1) {
        captureIndexRef.current = idx + 1;
        setCaptureIndex(idx + 1);
        stablePoseFramesRef.current = 0;
        armInvalidTimeout();
      } else {
        stopCamera();
        setStatusMsg("All angles captured successfully!");
      }
    }
  };

  const activePhaseGuide =
    step.key === "imageUpload" &&
    cameraState === "active" &&
    poseSuccessFlashIndex === null &&
    circleError === "none"
      ? PHASE_GUIDE[IMAGE_VIEWS[captureIndex]?.key ?? ""] ?? null
      : null;

  /**
   * Line below the circle: shorten when the live preview already shows pose/errors.
   * Keep full statusMsg for: detector load failure, permission error, timeout, imminent capture ("hold still").
   */
  const outerStatusBelowPreview =
    step.key !== "imageUpload"
      ? statusMsg
      : cameraState === "error"
        ? statusMsg
        : /Detector load failed/i.test(statusMsg)
          ? statusMsg
          : cameraState === "active"
            ? poseSuccessFlashIndex !== null
              ? "Saving angle…"
              : circleError !== "none"
                ? "Adjust using the guide in the preview above."
                : /hold still/i.test(statusMsg)
                  ? statusMsg
                  : activePhaseGuide
                    ? "Follow the on-screen guide in the preview above."
                    : statusMsg
            : cameraState === "idle" && cameraError && files.filter(Boolean).length < 3
              ? statusMsg
              : statusMsg;

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="font-heading">{step.title}</CardTitle>
        <CardDescription>
          This information helps us personalize your skin analysis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSuccess)} className="space-y-6">
          {step.key === "personalDetails" && (
            <>
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input {...form.register("fullName")} placeholder="Your name" />
                {err("fullName") && <p className="text-sm text-destructive">{err("fullName")}</p>}
              </div>
              <div className="space-y-2">
                <Label>Age</Label>
                <Input type="number" {...form.register("age")} placeholder="Age" />
                {err("age") && <p className="text-sm text-destructive">{err("age")}</p>}
              </div>
              <div className="space-y-2">
                <Label>Gender (optional)</Label>
                <Input {...form.register("gender")} placeholder="Optional" />
              </div>
            </>
          )}

          {step.key === "skinTypeTone" && (
            <>
              <div className="space-y-2">
                <Label>Skin type</Label>
                <Select
                  value={form.watch("skinType")}
                  onValueChange={(v) => form.setValue("skinType", v, { shouldValidate: true, shouldDirty: true })}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {SKIN_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {err("skinType") && <p className="text-sm text-destructive">{err("skinType")}</p>}
              </div>
              <div className="space-y-2">
                <Label>Skin tone</Label>
                <Select
                  value={form.watch("skinTone")}
                  onValueChange={(v) => form.setValue("skinTone", v, { shouldValidate: true, shouldDirty: true })}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {SKIN_TONES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {err("skinTone") && <p className="text-sm text-destructive">{err("skinTone")}</p>}
              </div>
            </>
          )}

          {step.key === "skinConcerns" && (
            <div className="space-y-3">
              <Label>Select all that apply</Label>
              <div className="grid grid-cols-1 gap-2">
                {CONCERN_OPTIONS.map((opt) => (
                  <label key={opt} className="flex items-center gap-2">
                    <Checkbox
                      checked={(form.watch("concerns") ?? []).includes(opt)}
                      onCheckedChange={(checked) => {
                        const prev = form.getValues("concerns") ?? [];
                        form.setValue(
                          "concerns",
                          checked ? [...prev, opt] : prev.filter((c) => c !== opt),
                          { shouldValidate: true }
                        );
                      }}
                    />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
              {err("concerns") && <p className="text-sm text-destructive">{err("concerns")}</p>}
            </div>
          )}

          {step.key === "lifestyle" && (
            <>
              <div className="space-y-2">
                <Label>Sun exposure</Label>
                <Select
                  value={form.watch("sunExposure")}
                  onValueChange={(v) => form.setValue("sunExposure", v, { shouldValidate: true, shouldDirty: true })}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Moderate">Moderate</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
                {err("sunExposure") && <p className="text-sm text-destructive">{err("sunExposure")}</p>}
              </div>
              <div className="space-y-2">
                <Label>Sleep (hours per night, optional)</Label>
                <Input type="number" {...form.register("sleepHours")} placeholder="e.g. 7" />
              </div>
              <div className="space-y-2">
                <Label>Diet (optional)</Label>
                <Input {...form.register("diet")} placeholder="e.g. Balanced" />
              </div>
              <div className="space-y-2">
                <Label>Stress level (optional)</Label>
                <Select
                  value={form.watch("stressLevel")}
                  onValueChange={(v) => form.setValue("stressLevel", v, { shouldValidate: true, shouldDirty: true })}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Moderate">Moderate</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {step.key === "medicalBackground" && (
            <>
              <div className="space-y-2">
                <Label>Skin or health conditions (comma-separated, or leave blank)</Label>
                <Input
                  placeholder="e.g. Eczema, Rosacea"
                  defaultValue={(data.medicalBackground?.conditions ?? []).join(", ")}
                  onChange={(e) =>
                    form.setValue(
                      "conditions",
                      e.target.value ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean) : []
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Medications (comma-separated, or leave blank)</Label>
                <Input
                  placeholder="e.g. Retinoids, Birth control"
                  defaultValue={(data.medicalBackground?.medications ?? []).join(", ")}
                  onChange={(e) =>
                    form.setValue(
                      "medications",
                      e.target.value ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean) : []
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Allergies (optional)</Label>
                <Input {...form.register("allergies")} placeholder="Known allergies" />
              </div>
            </>
          )}

          {step.key === "imageUpload" && (
            <div className="space-y-4">
              <Label>Start Live Assessment</Label>
              <p className="text-sm text-muted-foreground">
                Use live camera capture for 3 angles (front, left, right). Auto-capture triggers when the correct angle is detected.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={startCamera} disabled={cameraState === "starting" || cameraState === "active"}>
                  {cameraState === "starting" ? "Starting…" : "Start Live Assessment"}
                </Button>
                {cameraState === "active" && (
                  <>
                    <Button type="button" variant="ghost" onClick={stopCamera}>
                      Stop Camera
                    </Button>
                  </>
                )}
              </div>
              {(cameraError || cameraState === "unsupported") && (
                <p className="text-sm text-destructive">{cameraError ?? "Camera unavailable."}</p>
              )}
              <div className="space-y-3">
                <div className="relative mx-auto aspect-square w-full max-w-[min(100%,420px)]">
                  {cameraState === "active" && (
                    <div
                      className="pointer-events-none absolute inset-2 z-0 rounded-full border-2 border-dashed border-primary/40 face-scan-ring-active"
                      aria-hidden
                    />
                  )}
                  <div className="absolute inset-[14px] z-10 overflow-hidden rounded-full border border-border bg-muted/30 ring-2 ring-border/25">
                    <div className="relative h-full w-full">
                      <video
                        ref={videoRef}
                        className={
                          cameraState === "active"
                            ? "absolute inset-0 h-full w-full object-cover"
                            : "absolute inset-0 h-full w-full object-cover opacity-0"
                        }
                        muted
                        playsInline
                      />
                      {cameraState === "active" && (
                        <div className="face-scan-sweep-host z-[1]" aria-hidden />
                      )}
                      {activePhaseGuide && (
                        <div className="pointer-events-none absolute left-3 right-3 top-3 z-[16] flex flex-col items-center gap-0.5 text-center">
                          <p className="text-sm font-semibold text-foreground drop-shadow-sm">{activePhaseGuide.title}</p>
                          <p className="text-[11px] leading-snug text-muted-foreground drop-shadow-sm">
                            {activePhaseGuide.subtitle}
                          </p>
                        </div>
                      )}
                      {poseSuccessFlashIndex !== null && (
                        <div
                          className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-1 bg-background/55 px-3 text-center backdrop-blur-sm face-scan-flash-enter pointer-events-none"
                          aria-live="polite"
                        >
                          <Check className="h-10 w-10 text-primary" strokeWidth={2} aria-hidden />
                          <p className="text-sm font-medium text-foreground">
                            {POSE_SAVED_LABELS[IMAGE_VIEWS[poseSuccessFlashIndex]?.key] ?? "Angle saved"}
                          </p>
                          <p className="text-xs text-muted-foreground">Got it</p>
                        </div>
                      )}
                      {files.filter(Boolean).length === 3 &&
                        cameraState === "idle" &&
                        poseSuccessFlashIndex === null && (
                          <div
                            className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-background/65 px-3 text-center backdrop-blur-md pointer-events-none"
                            aria-live="polite"
                          >
                            <Check className="h-11 w-11 text-primary" strokeWidth={2} aria-hidden />
                            <p className="text-sm font-semibold text-foreground">Assessment complete</p>
                          </div>
                        )}
                      {cameraError &&
                        (cameraState === "error" ||
                          (cameraState === "idle" && files.filter(Boolean).length < 3)) && (
                          <div className="pointer-events-none absolute inset-0 z-[28] flex flex-col items-center justify-center gap-2 bg-background/55 px-3 text-center backdrop-blur-sm">
                            <AlertCircle className="h-8 w-8 text-destructive" aria-hidden />
                            <p className="text-xs font-medium text-foreground">{cameraError}</p>
                          </div>
                        )}
                      {cameraState === "active" && poseSuccessFlashIndex === null && circleError === "no_face" && (
                        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-background/45 px-3 text-center backdrop-blur-sm">
                          <AlertCircle className="h-9 w-9 text-destructive" aria-hidden />
                          <p className="text-xs font-medium text-foreground">No face detected</p>
                          <p className="text-[11px] text-muted-foreground">Move into frame</p>
                        </div>
                      )}
                      {cameraState === "active" && poseSuccessFlashIndex === null && circleError === "multi" && (
                        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-background/45 px-3 text-center backdrop-blur-sm">
                          <AlertCircle className="h-9 w-9 text-destructive" aria-hidden />
                          <p className="text-xs font-medium text-foreground">Multiple faces</p>
                          <p className="text-[11px] text-muted-foreground">Only you should be visible</p>
                        </div>
                      )}
                      {cameraState === "active" && poseSuccessFlashIndex === null && circleError === "none" && (
                        <>
                          {IMAGE_VIEWS[captureIndex]?.key === "left_profile" && (
                            <div className="pointer-events-none absolute bottom-4 left-2 right-2 z-[15] flex justify-center">
                              <ChevronRight className="h-10 w-10 text-primary drop-shadow-md" strokeWidth={2.5} aria-hidden />
                            </div>
                          )}
                          {IMAGE_VIEWS[captureIndex]?.key === "right_profile" && (
                            <div className="pointer-events-none absolute bottom-4 left-2 right-2 z-[15] flex justify-center">
                              <ChevronLeft className="h-10 w-10 text-primary drop-shadow-md" strokeWidth={2.5} aria-hidden />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <p
                  className={
                    cameraState === "active"
                      ? "mx-auto max-w-[min(100%,420px)] rounded-full bg-muted/80 px-3 py-2 text-center text-sm text-muted-foreground backdrop-blur-sm"
                      : "text-center text-sm text-muted-foreground"
                  }
                >
                  {outerStatusBelowPreview}
                </p>
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <div className="grid gap-3">
                {IMAGE_VIEWS.map((view, i) => (
                  <div key={view.key} className="space-y-1">
                    <Label className="text-xs">{view.label}</Label>
                    <div className="rounded-md border px-3 py-2 text-xs text-muted-foreground">
                      {files[i] ? "Complete" : "Pending"}
                      {i === captureIndex && cameraState === "active" && !files[i] ? " · Next target" : ""}
                    </div>
                    {files[i] && <p className="text-xs text-muted-foreground">{files[i].name}</p>}
                  </div>
                ))}
              </div>
              {files.filter(Boolean).length < 3 && (
                <p className="text-sm text-destructive">
                  {3 - files.filter(Boolean).length} more image(s) required.
                </p>
              )}
              {showQuestionnaireSkip && onContinueWithoutScan && (
                <div className="pt-2 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-2">
                    No camera or prefer not to scan? You can still get a personalized routine from your answers.
                  </p>
                  <Button type="button" variant="outline" onClick={onContinueWithoutScan}>
                    Continue without face scan
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            {onBack && (
              <Button type="button" variant="outline" onClick={onBack}>
                Back
              </Button>
            )}
            <Button
              type="submit"
              disabled={
                (step.key === "imageUpload" && files.filter(Boolean).length < 3) ||
                (step.key !== "imageUpload" && !form.formState.isValid)
              }
            >
              {step.key === "imageUpload" ? "Continue to review" : "Next"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const showQuestionnaireSkipOption =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_ENABLE_QUESTIONNAIRE_ONLY_ASSESSMENT !== "false";

export default function AssessmentStartPage() {
  const router = useRouter();
  const { data, setStepData, setCompleted, setSubmissionMode } = useAssessmentStore();
  const [stepIndex, setStepIndex] = useState(0);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);

  const step = stepConfig[stepIndex];
  const isLast = stepIndex === stepConfig.length - 1;

  const handleSuccess = (values: unknown) => {
    if (step.key === "skinConcerns") {
      setStepData("skinConcerns", (values as { concerns: string[] }).concerns);
    } else if (step.key === "medicalBackground") {
      const mb = values as AssessmentStepData["medicalBackground"];
      const allergies = mb?.allergies?.trim() ? mb.allergies.trim() : undefined;
      setStepData("medicalBackground", {
        conditions: mb?.conditions ?? [],
        medications: mb?.medications ?? [],
        allergies,
      } as AssessmentStepData["medicalBackground"]);
    } else if (step.key === "imageUpload") {
      setSubmissionMode("vision");
      setStepData("imageUpload", { fileNames, files });
    } else if (step.key === "personalDetails") {
      const pd = values as AssessmentStepData["personalDetails"];
      setStepData("personalDetails", {
        fullName: pd!.fullName.trim(),
        age: pd!.age,
        gender: pd!.gender?.trim() ? pd!.gender.trim() : undefined,
      } as AssessmentStepData["personalDetails"]);
    } else if (step.key === "skinTypeTone") {
      setStepData("skinTypeTone", values as AssessmentStepData["skinTypeTone"]);
    } else if (step.key === "lifestyle") {
      const ls = values as AssessmentStepData["lifestyle"];
      setStepData("lifestyle", {
        sunExposure: ls!.sunExposure,
        sleepHours: ls!.sleepHours,
        stressLevel: ls!.stressLevel,
        diet: ls!.diet?.trim() ? ls!.diet.trim() : undefined,
      } as AssessmentStepData["lifestyle"]);
    }

    if (isLast) {
      setCompleted(true);
      router.push("/dashboard/assessment/review");
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Skin Assessment</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Step {stepIndex + 1} of {stepConfig.length}
        </p>
        <Progress value={((stepIndex + 1) / stepConfig.length) * 100} className="mt-2" />
      </div>

      <StepForm
        key={stepIndex}
        step={step}
        data={data}
        fileNames={fileNames}
        setFileNames={setFileNames}
        files={files}
        setFiles={setFiles}
        onSuccess={handleSuccess}
        onBack={stepIndex > 0 ? () => setStepIndex((i) => i - 1) : undefined}
        showQuestionnaireSkip={showQuestionnaireSkipOption && step.key === "imageUpload"}
        onContinueWithoutScan={
          step.key === "imageUpload"
            ? () => {
                setSubmissionMode("questionnaire");
                setStepData("imageUpload", { fileNames: [], files: [], skipped: true });
                setCompleted(true);
                router.push("/dashboard/assessment/review");
              }
            : undefined
        }
      />
    </div>
  );
}
