"use client";

import { useState } from "react";
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

const CONCERN_OPTIONS = ["Acne", "Dryness", "Oiliness", "Hyperpigmentation", "Fine lines", "Sensitivity", "Redness", "Dullness"];
const SKIN_TYPES = ["Dry", "Oily", "Combination", "Normal", "Sensitive"];
const SKIN_TONES = ["Fair", "Light", "Medium", "Tan", "Deep", "Dark"];

const IMAGE_VIEWS: { key: string; label: string }[] = [
  { key: "front_face", label: "Front face" },
  { key: "left_profile", label: "Left profile" },
  { key: "right_profile", label: "Right profile" },
  { key: "upward_angle", label: "Upward angle" },
  { key: "downward_angle", label: "Downward angle" },
];

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
      fileNames: z.array(z.string()).length(5, "Upload all 5 face images"),
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
  setFileNames: (f: string[]) => void;
  files: File[];
  setFiles: (f: File[]) => void;
  onSuccess: (values: unknown) => void;
  onBack?: () => void;
}

function StepForm({ step, data, fileNames, setFileNames, files, setFiles, onSuccess, onBack }: StepFormProps) {
  type StepValues = z.infer<typeof step.schema>;
  const form = useForm<StepValues>({
    resolver: zodResolver(step.schema),
    defaultValues: getDefaultValues(step.key, data, fileNames) as StepValues,
  });
  const err = (name: string) => (form.formState.errors as Record<string, { message?: string }>)[name]?.message;

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
                  onValueChange={(v) => form.setValue("skinType", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {SKIN_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Skin tone</Label>
                <Select
                  value={form.watch("skinTone")}
                  onValueChange={(v) => form.setValue("skinTone", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {SKIN_TONES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                          checked ? [...prev, opt] : prev.filter((c) => c !== opt)
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
                  onValueChange={(v) => form.setValue("sunExposure", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Moderate">Moderate</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
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
                  onValueChange={(v) => form.setValue("stressLevel", v)}
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
              <Label>Upload 5 clear face images (one per angle)</Label>
              <p className="text-sm text-muted-foreground">
                Please upload a clear face image for each angle. Only images with a detectable face will be accepted.
              </p>
              <div className="grid gap-3">
                {IMAGE_VIEWS.map((view, i) => (
                  <div key={view.key} className="space-y-1">
                    <Label className="text-xs">{view.label}</Label>
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const next = [...files];
                          next[i] = file;
                          setFiles(next);
                          const nextNames = [...fileNames];
                          nextNames[i] = file.name;
                          setFileNames(nextNames);
                          form.setValue("fileNames", nextNames);
                        }
                      }}
                    />
                    {files[i] && <p className="text-xs text-muted-foreground">{files[i].name}</p>}
                  </div>
                ))}
              </div>
              {files.filter(Boolean).length < 5 && (
                <p className="text-sm text-destructive">
                  {5 - files.filter(Boolean).length} more image(s) required.
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            {onBack && (
              <Button type="button" variant="outline" onClick={onBack}>
                Back
              </Button>
            )}
            <Button type="submit" disabled={step.key === "imageUpload" && files.filter(Boolean).length < 5}>
              {step.key === "imageUpload" ? "Continue to review" : "Next"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function AssessmentStartPage() {
  const router = useRouter();
  const { data, setStepData, setCompleted } = useAssessmentStore();
  const [stepIndex, setStepIndex] = useState(0);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);

  const step = stepConfig[stepIndex];
  const isLast = stepIndex === stepConfig.length - 1;

  const handleSuccess = (values: unknown) => {
    if (step.key === "skinConcerns") {
      setStepData("skinConcerns", (values as { concerns: string[] }).concerns);
    } else if (step.key === "medicalBackground") {
      setStepData("medicalBackground", values as AssessmentStepData["medicalBackground"]);
    } else if (step.key === "imageUpload") {
      setStepData("imageUpload", { fileNames, files });
    } else if (step.key === "personalDetails") {
      setStepData("personalDetails", values as AssessmentStepData["personalDetails"]);
    } else if (step.key === "skinTypeTone") {
      setStepData("skinTypeTone", values as AssessmentStepData["skinTypeTone"]);
    } else if (step.key === "lifestyle") {
      setStepData("lifestyle", values as AssessmentStepData["lifestyle"]);
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
      />
    </div>
  );
}
