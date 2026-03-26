export interface RoutineEngineInput {
  skin_type?: string | null;
  concerns: string[];
  image_analysis?: {
    acne_score?: number | null;
    pigmentation_score?: number | null;
    hydration_score?: number | null;
  };
  lifestyle?: {
    sleep_hours?: number | null;
    sun_exposure?: string | null;
  };
  product_names?: {
    cleanser?: string | null;
    serum?: string | null;
    moisturizer?: string | null;
    sunscreen?: string | null;
  };
}

export interface RoutinePlanOutput {
  morningRoutine: string[];
  nightRoutine: string[];
  lifestyle: {
    foodAdvice: string[];
    hydration: string[];
    sleep: string[];
  };
}

export function generateRoutinePlan(input: RoutineEngineInput): RoutinePlanOutput {
  const skinType = (input.skin_type ?? "").toLowerCase();
  const concerns = (input.concerns ?? []).map((c) => c.toLowerCase());
  const acneScore = input.image_analysis?.acne_score ?? null;
  const pigmentationScore = input.image_analysis?.pigmentation_score ?? null;
  const hydrationScore = input.image_analysis?.hydration_score ?? null;
  const sleepHours = input.lifestyle?.sleep_hours ?? null;
  const sunExposure = (input.lifestyle?.sun_exposure ?? "").toLowerCase();
  const productNames = input.product_names ?? {};

  const morning: string[] = [];
  const night: string[] = [];
  const foodAdvice: string[] = [];
  const hydration: string[] = [];
  const sleep: string[] = [];

  // Core cleansing and protection
  morning.push(
    productNames.cleanser
      ? `Cleanse with ${productNames.cleanser}`
      : "Cleanse with a gentle, non-stripping cleanser"
  );
  if (skinType.includes("oily")) {
    morning.push("Use a lightweight, oil-control moisturizer");
  } else if (skinType.includes("dry")) {
    morning.push("Apply a rich, barrier-repair moisturizer");
  } else {
    morning.push("Use a balanced moisturizer suited for normal/combination skin");
  }
  morning.push(
    productNames.sunscreen
      ? `Apply ${productNames.sunscreen} as the last step (broad-spectrum SPF)`
      : "Apply broad-spectrum SPF 30+ every morning as the last step"
  );

  // Targeted morning treatments
  if (pigmentationScore !== null && pigmentationScore >= 0.6) {
    morning.push(
      productNames.serum
        ? `Use ${productNames.serum} to target dark spots`
        : "Use a brightening serum (vitamin C, niacinamide) to target dark spots"
    );
  }

  // Night routine base
  night.push("Double cleanse in the evening if you wore sunscreen or makeup");
  night.push(
    productNames.serum
      ? `Apply ${productNames.serum} to support hydration and tone overnight`
      : "Apply a hydrating serum to replenish moisture overnight"
  );

  const hasAcneConcern =
    concerns.some((c) => c.includes("acne") || c.includes("breakout")) ||
    (acneScore !== null && acneScore >= 0.6);

  if (hasAcneConcern) {
    night.push("Introduce a BHA (salicylic acid) treatment 2–3x per week for congestion");
  }

  if (pigmentationScore !== null && pigmentationScore >= 0.6) {
    night.push("Use pigment-fading actives (azelaic acid, niacinamide) on alternate nights");
  }

  night.push("Finish with a moisturizer appropriate for your skin type");
  if (productNames.moisturizer) {
    night.push(`Moisturizer: ${productNames.moisturizer}`);
  }

  const hasDrynessConcern =
    skinType.includes("dry") ||
    concerns.some((c) => c.includes("dry") || c.includes("flaky")) ||
    (hydrationScore !== null && hydrationScore < 0.5);

  if (hasDrynessConcern) {
    night.push("Consider adding an overnight barrier-repair mask 2–3x per week");
  }

  const hasSensitivityConcern = concerns.some(
    (c) => c.includes("sensitive") || c.includes("red") || c.includes("irritation")
  );

  if (hasSensitivityConcern) {
    night.push("Avoid harsh scrubs and high-percentage acids; patch test any new active.");
  }

  // Lifestyle guidance
  foodAdvice.push("Prioritize whole foods rich in antioxidants (fruits, vegetables, healthy fats)");
  if (hasAcneConcern) {
    foodAdvice.push("Moderate high-glycemic foods and excessive dairy if they trigger breakouts for you.");
  }

  hydration.push("Aim for steady water intake across the day rather than large infrequent amounts.");
  hydration.push("Limit extremely dehydrating habits (very high caffeine, smoking, heavy alcohol).");
  if (hydrationScore !== null && hydrationScore < 0.5) {
    hydration.push("Because your hydration score is low, add more water-rich foods and consider a humidifier at night.");
  }

  if (typeof sleepHours === "number" && Number.isFinite(sleepHours) && sleepHours > 0) {
    if (sleepHours < 7) {
      sleep.push(`Try to increase sleep from ${sleepHours}h toward 7–8h when possible — skin recovery improves with consistency.`);
    } else {
      sleep.push(`Maintain your sleep consistency (~${sleepHours}h/night) to support skin repair.`);
    }
  } else {
    sleep.push("Target 7–8 hours of consistent sleep where possible.");
  }
  sleep.push("Maintain a regular wind-down routine and avoid blue light right before bed.");
  if (sunExposure.includes("high")) {
    morning.push("Reapply sunscreen every 2–3 hours when outdoors, especially with high sun exposure.");
  }

  return {
    morningRoutine: morning,
    nightRoutine: night,
    lifestyle: {
      foodAdvice,
      hydration,
      sleep,
    },
  };
}

