/**
 * Client-side view model for skin assessment / report display (not a DB schema).
 */

export type SeverityBucket = "low" | "moderate" | "high";

export interface AssessmentResult {
  skinType: string;
  concerns: string[];
  sensitivityLevel: string;
  recommendedIngredients: string[];
  avoidIngredients: string[];
  routineSteps: string[];
  confidenceScore: number | null;
}

export function safeString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

export function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Split routine / condition prose into discrete steps for UI lists. */
export function parseRoutineSteps(text: unknown): string[] {
  const s = safeString(text);
  if (!s) return [];
  const chunks = s
    .split(/\r?\n+/)
    .flatMap((line) => line.split(/\s*(?:•|·|–|-|\*)\s+/))
    .map((part) => part.replace(/^\d+[\).\]]\s*/, "").trim())
    .filter(Boolean);
  const deduped = Array.from(new Set(chunks));
  return deduped.length > 0 ? deduped : [s];
}

export function normalizeSeverityLabel(input: unknown): SeverityBucket | null {
  const s = safeString(input).toLowerCase();
  if (!s) return null;
  if (/\b(high|severe|intense)\b/.test(s)) return "high";
  if (/\b(low|minimal|mild|slight)\b/.test(s)) return "low";
  if (/\b(moderate|medium|mid|average|mod)\b/.test(s)) return "moderate";
  return null;
}

function severityDisplay(bucket: SeverityBucket): string {
  if (bucket === "low") return "Low";
  if (bucket === "high") return "High";
  return "Moderate";
}

function collectIngredientsFromRecommendedProducts(products: unknown[] | undefined): string[] {
  if (!Array.isArray(products)) return [];
  const out = new Set<string>();
  for (const row of products) {
    if (!row || typeof row !== "object") continue;
    const p = (row as { product?: Record<string, unknown> }).product;
    if (!p || typeof p !== "object") continue;
    const raw =
      p.key_ingredients ??
      p.keyIngredients ??
      (p as { keyIngredients?: unknown }).keyIngredients;
    const arr = safeStringArray(raw);
    arr.forEach((x) => out.add(x));
  }
  return Array.from(out).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

function readAvoidIngredients(raw: Record<string, unknown>): string[] {
  const v =
    raw.avoid_ingredients ??
    raw.avoidIngredients ??
    raw.ingredients_to_avoid ??
    raw.ingredientsToAvoid;
  if (Array.isArray(v)) return safeStringArray(v);
  if (typeof v === "string" && v.trim()) return parseRoutineSteps(v);
  return [];
}

function readRecommendedIngredientsArray(raw: Record<string, unknown>): string[] {
  const v = raw.recommended_ingredients ?? raw.recommendedIngredients;
  if (Array.isArray(v)) {
    const arr = safeStringArray(v);
    return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }
  return [];
}

/** Structured fields merged into Report after base normalization. */
export interface ReportStructuredFields {
  routineSteps: string[];
  recommendedIngredients: string[];
  avoidIngredients: string[];
  sensitivityLevel?: string;
  inflammationLevelNormalized?: SeverityBucket;
  confidenceScore: number | null;
}

export function buildAssessmentResultFromReportPayload(
  raw: Record<string, unknown>,
  options?: { recommendedProducts?: unknown[] }
): ReportStructuredFields {
  const routineFromRoutine = parseRoutineSteps(raw.recommended_routine ?? raw.recommendedRoutine);
  const routineFromCondition = parseRoutineSteps(raw.skin_condition ?? raw.skinCondition);
  const routineSteps =
    routineFromRoutine.length > 0 ? routineFromRoutine : routineFromCondition;

  const fromApiArrays = readRecommendedIngredientsArray(raw);
  const fromProducts = collectIngredientsFromRecommendedProducts(options?.recommendedProducts);
  const recommendedIngredients = Array.from(new Set([...fromApiArrays, ...fromProducts])).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );

  const avoidIngredients = readAvoidIngredients(raw);

  const sensRaw = raw.sensitivity_level ?? raw.sensitivityLevel;
  const sensStr = safeString(sensRaw);
  const inflRaw = raw.inflammation_level ?? raw.inflammationLevel;
  const inflBucket = normalizeSeverityLabel(inflRaw) ?? normalizeSeverityLabel(sensStr);

  let sensitivityLevel = sensStr;
  if (!sensitivityLevel && inflBucket) {
    sensitivityLevel = severityDisplay(inflBucket);
  }

  const skinScoreRaw = raw.skin_score ?? raw.skinScore;
  let confidenceScore: number | null = null;
  if (typeof skinScoreRaw === "number" && Number.isFinite(skinScoreRaw) && skinScoreRaw >= 0 && skinScoreRaw <= 100) {
    confidenceScore = skinScoreRaw;
  }

  return {
    routineSteps,
    recommendedIngredients,
    avoidIngredients,
    ...(sensitivityLevel ? { sensitivityLevel } : {}),
    ...(inflBucket ? { inflammationLevelNormalized: inflBucket } : {}),
    confidenceScore,
  };
}

export function reportToAssessmentResult(report: {
  skinType?: string;
  concerns?: string[];
  routineSteps?: string[];
  recommendedIngredients?: string[];
  avoidIngredients?: string[];
  sensitivityLevel?: string;
  skinScore?: number;
  confidenceScore?: number | null;
  summary?: string;
}): AssessmentResult {
  const concerns = Array.isArray(report.concerns) ? report.concerns.filter(Boolean) : [];
  const routineSteps = Array.isArray(report.routineSteps) ? report.routineSteps : [];
  const recommendedIngredients = Array.isArray(report.recommendedIngredients)
    ? report.recommendedIngredients
    : [];
  const avoidIngredients = Array.isArray(report.avoidIngredients) ? report.avoidIngredients : [];

  const skinType = safeString(report.skinType) || "—";
  const sensitivityLevel = safeString(report.sensitivityLevel) || "—";

  let confidenceScore: number | null = null;
  if (report.skinScore != null && Number.isFinite(report.skinScore)) {
    confidenceScore = report.skinScore;
  } else if (report.confidenceScore != null && Number.isFinite(report.confidenceScore)) {
    confidenceScore = report.confidenceScore;
  }

  return {
    skinType,
    concerns,
    sensitivityLevel,
    recommendedIngredients,
    avoidIngredients,
    routineSteps: routineSteps.length > 0 ? routineSteps : parseRoutineSteps(report.summary),
    confidenceScore,
  };
}
