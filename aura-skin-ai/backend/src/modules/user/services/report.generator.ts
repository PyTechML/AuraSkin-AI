import { Injectable } from "@nestjs/common";
import type { DbAssessment } from "../../../database/models";

export interface GeneratedReport {
  acne_score: number;
  pigmentation_score: number;
  hydration_score: number;
  skin_condition: string;
  recommended_routine: string;
}

@Injectable()
export class ReportGenerator {
  generateFromAssessment(assessment: DbAssessment): GeneratedReport {
    const skinType = (assessment.skin_type ?? "").toLowerCase();
    const primary = (assessment.primary_concern ?? "").toLowerCase();
    const secondary = (assessment.secondary_concern ?? "").toLowerCase();
    const sensitivity = (assessment.sensitivity_level ?? "").toLowerCase();
    const lifestyle = (assessment.lifestyle_factors ?? "").toLowerCase();

    const concerns: string[] = [];
    if (primary) concerns.push(primary);
    if (secondary) concerns.push(secondary);

    // Graduated rule-based scores between 0 and 1 (avoid binary jumps that produce repeated totals).
    let acneScore = 0.22;
    if (concerns.some((c) => c.includes("acne") || c.includes("breakout"))) {
      acneScore = primary.includes("acne") || primary.includes("breakout") ? 0.62 : 0.5;
    }

    let pigmentationScore = 0.2;
    if (concerns.some((c) => c.includes("pigment") || c.includes("dark spot"))) {
      pigmentationScore = primary.includes("pigment") || primary.includes("dark spot") ? 0.6 : 0.48;
    }

    let hydrationScore = 0.56;
    if (skinType.includes("dry") || concerns.some((c) => c.includes("dry"))) {
      hydrationScore = 0.4;
    } else if (skinType.includes("oily")) {
      hydrationScore = 0.6;
    }
    if (lifestyle.includes("low water") || lifestyle.includes("dehydrated")) {
      hydrationScore = Math.max(hydrationScore - 0.12, 0.1);
    }

    const hasSensitivity =
      sensitivity.includes("high") ||
      sensitivity.includes("sensitive") ||
      concerns.some((c) => c.includes("red") || c.includes("irritation"));

    if (hasSensitivity) {
      acneScore = Math.min(1, acneScore + 0.06);
      hydrationScore = Math.max(0, hydrationScore - 0.06);
    }

    const parts: string[] = [];

    // Morning routine
    const morning: string[] = [];
    morning.push("Gentle cleanse with non-stripping cleanser");
    if (skinType.includes("oily") || concerns.some((c) => c.includes("oil"))) {
      morning.push("Use a lightweight, non-comedogenic moisturizer");
    } else {
      morning.push("Apply hydrating serum with humectants (e.g. glycerin, hyaluronic acid)");
      morning.push("Seal with barrier-supporting moisturizer");
    }
    morning.push("Finish with broad-spectrum SPF 30+ every morning");

    // Evening routine
    const evening: string[] = [];
    evening.push("Double cleanse if using sunscreen or makeup");
    if (acneScore >= 0.6) {
      evening.push("Introduce BHA (salicylic acid) 2–3x/week to target breakouts");
    }
    if (pigmentationScore >= 0.6) {
      evening.push("Use pigment-targeting serum (e.g. niacinamide, vitamin C, azelaic acid)");
    }
    evening.push("Apply moisturizer appropriate for your skin type");

    if (hasSensitivity) {
      evening.push("Avoid harsh scrubs and high-percentage acids; patch test new products");
    }

    // Lifestyle guidance
    const lifestyleTips: string[] = [];
    lifestyleTips.push("Aim for consistent 7–8 hours of sleep where possible");
    lifestyleTips.push("Maintain steady daily water intake and avoid extreme dehydration");
    if (acneScore >= 0.6) {
      lifestyleTips.push("Limit comedogenic heavy oils and ensure pillowcases are changed regularly");
    }

    parts.push("Morning routine:");
    parts.push(`- ${morning.join("\n- ")}`);
    parts.push("");
    parts.push("Evening routine:");
    parts.push(`- ${evening.join("\n- ")}`);
    parts.push("");
    parts.push("Lifestyle & habit guidance:");
    parts.push(`- ${lifestyleTips.join("\n- ")}`);

    const skinCondition =
      acneScore >= 0.6
        ? "Acne-prone"
        : pigmentationScore >= 0.6
        ? "Pigmentation-prone"
        : hasSensitivity
        ? "Sensitive"
        : skinType || "Balanced";

    const routineSummary = parts.join("\n");

    return {
      acne_score: acneScore,
      pigmentation_score: pigmentationScore,
      hydration_score: hydrationScore,
      skin_condition: skinCondition,
      recommended_routine: routineSummary,
    };
  }
}

