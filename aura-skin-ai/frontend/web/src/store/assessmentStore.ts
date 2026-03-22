import { create } from "zustand";
import type { AssessmentStepData, AssessmentSubmissionMode } from "@/types";

type StepKey = keyof AssessmentStepData;

interface AssessmentState {
  data: AssessmentStepData;
  completed: boolean;
  /** How the user will submit from review: live scan vs questionnaire-only. */
  submissionMode: AssessmentSubmissionMode | null;
  setStepData: (step: StepKey, data: AssessmentStepData[StepKey]) => void;
  resetAssessment: () => void;
  setCompleted: (value: boolean) => void;
  setSubmissionMode: (mode: AssessmentSubmissionMode | null) => void;
}

const initialState: AssessmentStepData = {
  personalDetails: undefined,
  skinTypeTone: undefined,
  skinConcerns: undefined,
  lifestyle: undefined,
  medicalBackground: undefined,
  imageUpload: undefined,
};

export const useAssessmentStore = create<AssessmentState>((set) => ({
  data: initialState,
  completed: false,
  submissionMode: null,
  setStepData: (step, data) =>
    set((state) => ({
      data: { ...state.data, [step]: data },
    })),
  resetAssessment: () =>
    set({ data: initialState, completed: false, submissionMode: null }),
  setCompleted: (value) => set({ completed: value }),
  setSubmissionMode: (mode) => set({ submissionMode: mode }),
}));
