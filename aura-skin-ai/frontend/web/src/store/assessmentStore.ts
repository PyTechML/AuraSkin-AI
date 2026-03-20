import { create } from "zustand";
import type { AssessmentStepData } from "@/types";

type StepKey = keyof AssessmentStepData;

interface AssessmentState {
  data: AssessmentStepData;
  completed: boolean;
  setStepData: (step: StepKey, data: AssessmentStepData[StepKey]) => void;
  resetAssessment: () => void;
  setCompleted: (value: boolean) => void;
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
  setStepData: (step, data) =>
    set((state) => ({
      data: { ...state.data, [step]: data },
    })),
  resetAssessment: () =>
    set({ data: initialState, completed: false }),
  setCompleted: (value) => set({ completed: value }),
}));
