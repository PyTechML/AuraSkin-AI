"use client";

import { SupportLayout } from "@/components/support/SupportLayout";
import { SupportHero } from "@/components/support/SupportHero";
import { SupportSection } from "@/components/support/SupportSection";

export default function DisclaimerPage() {
  return (
    <SupportLayout>
      <SupportHero
        title="Important Notice"
        subtitle="AuraSkin AI assists — it does not replace professional care."
      />

      <SupportSection
        title="Educational Use"
        subtitle="AuraSkin AI is designed to support learning about skincare—not to diagnose, treat, or prescribe."
        background="glass3"
        variant="fadeUp"
      >
        <p className="text-muted-foreground font-body text-base leading-relaxed">
          The insights and recommendations you receive through the platform are intended for
          informational and educational purposes only. They are meant to help you better understand
          how different factors may influence your skin and routine choices.
        </p>
        <p className="text-muted-foreground font-body text-base leading-relaxed">
          Nothing presented by AuraSkin AI should be interpreted as a personal medical evaluation,
          clinical diagnosis, or treatment plan.
        </p>
      </SupportSection>

      <SupportSection
        title="AI Limitations"
        subtitle="Our models rely on the information you choose to share."
        background="glass4"
        variant="fadeUp"
      >
        <p className="text-muted-foreground font-body text-base leading-relaxed">
          AI systems, including AuraSkin AI, infer patterns from the inputs provided. If information
          is incomplete, inaccurate, or does not include relevant medical context, recommendations
          may not fully reflect your situation.
        </p>
        <p className="text-muted-foreground font-body text-base leading-relaxed">
          The platform does not have access to your full medical history, laboratory results, or in
          person skin examinations. As a result, it cannot reliably detect underlying conditions or
          contraindications that a dermatologist might identify.
        </p>
      </SupportSection>

      <SupportSection
        title="Medical Disclaimer"
        subtitle="AuraSkin AI is not a substitute for professional medical advice, diagnosis, or treatment."
        background="glass3"
        variant="fadeUp"
      >
        <p className="text-muted-foreground font-body text-base leading-relaxed">
          Always seek the advice of a dermatologist or other qualified healthcare professional with
          any questions you have regarding a skin condition, treatment, or product. Never disregard
          professional advice or delay seeking it because of something you have read or received
          from AuraSkin AI.
        </p>
        <p className="text-muted-foreground font-body text-base leading-relaxed">
          If you experience severe reactions, sudden changes in your skin, or other health
          concerns, contact a healthcare professional or emergency services as appropriate for your
          region.
        </p>
      </SupportSection>

      <SupportSection
        title="User Decisions"
        subtitle="Final skincare decisions always remain with you."
        background="glass4"
        variant="fadeOnly"
      >
        <p className="text-muted-foreground font-body text-base leading-relaxed">
          You are responsible for deciding which products to use, which routines to follow, and when
          to seek in-person care. AuraSkin AI provides structured guidance, but it cannot guarantee
          specific results or outcomes.
        </p>
        <p className="text-muted-foreground font-body text-base leading-relaxed">
          By using the platform, you acknowledge these limitations and agree to treat the
          information as one of several inputs in your decision-making process—not as definitive
          medical instruction.
        </p>
      </SupportSection>
    </SupportLayout>
  );
}
