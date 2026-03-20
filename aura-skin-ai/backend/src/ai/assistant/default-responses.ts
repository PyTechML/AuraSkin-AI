export const ASSISTANT_DEFAULT_RESPONSES: string[] = [
  "Please consult a dermatologist before applying skincare products.",
  "I can help with skincare guidance based on your assessment.",
  "For medical concerns, please consult a dermatologist.",
  "For medical concerns, we recommend contacting a dermatologist.",
  "Your skin routine recommendations are based on your latest assessment.",
  "I can help you navigate AuraSkin and explain how features work.",
];

export function pickDefaultResponse(): string {
  if (!ASSISTANT_DEFAULT_RESPONSES.length) {
    return "I can help with skincare guidance and AuraSkin features.";
  }
  const idx = Math.floor(Math.random() * ASSISTANT_DEFAULT_RESPONSES.length);
  return ASSISTANT_DEFAULT_RESPONSES[idx];
}

