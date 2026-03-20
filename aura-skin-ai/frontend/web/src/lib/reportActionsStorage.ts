export type SymptomTag = "Dryness" | "Breakouts" | "Redness" | "Oiliness" | "Sensitivity";

export type RoutineEntry = {
  morning: boolean;
  evening: boolean;
  skipped: boolean;
};

export type SymptomEntry = {
  id: string;
  at: number;
  tags: SymptomTag[];
};

export type ReportActionsStateV1 = {
  version: 1;
  personalNote: string;
  routineByDate: Record<string, RoutineEntry>;
  symptomTimeline: SymptomEntry[];
  reminderEnabled: boolean;
};

export function defaultReportActionsState(): ReportActionsStateV1 {
  return {
    version: 1,
    personalNote: "",
    routineByDate: {},
    symptomTimeline: [],
    reminderEnabled: false,
  };
}

export function storageKeyForReportActions(userId: string, reportId: string): string {
  return `auraskin-report-actions:v1:${userId}:${reportId}`;
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadReportActionsState(userId: string, reportId: string): ReportActionsStateV1 {
  const fallback = defaultReportActionsState();
  if (!canUseStorage()) return fallback;

  try {
    const raw = window.localStorage.getItem(storageKeyForReportActions(userId, reportId));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<ReportActionsStateV1> | null;
    if (!parsed || parsed.version !== 1) return fallback;

    return {
      version: 1,
      personalNote: typeof parsed.personalNote === "string" ? parsed.personalNote : "",
      routineByDate: typeof parsed.routineByDate === "object" && parsed.routineByDate ? (parsed.routineByDate as Record<string, RoutineEntry>) : {},
      symptomTimeline: Array.isArray(parsed.symptomTimeline) ? (parsed.symptomTimeline as SymptomEntry[]) : [],
      reminderEnabled: !!parsed.reminderEnabled,
    };
  } catch {
    return fallback;
  }
}

export function saveReportActionsState(userId: string, reportId: string, state: ReportActionsStateV1): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(storageKeyForReportActions(userId, reportId), JSON.stringify(state));
  } catch {
    // ignore storage quota / disabled storage
  }
}

