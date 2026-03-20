"use client";

import { SupportLayout } from "@/components/support/SupportLayout";
import { SupportHero } from "@/components/support/SupportHero";
import { SupportSection } from "@/components/support/SupportSection";

export default function TermsOfServicePage() {
  return (
    <SupportLayout>
      <SupportHero
        title="Platform Terms"
        subtitle="Using AuraSkin AI requires agreement to the following conditions."
      />

      <SupportSection
        title="Acceptable Use"
        subtitle="By using the platform, you agree to use it responsibly and in good faith."
        background="glass3"
        variant="fadeUp"
      >
        <p className="text-muted-foreground font-body text-base leading-relaxed">
          Users agree to:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-muted-foreground font-body text-base leading-relaxed">
          <li>
            <span className="font-semibold text-foreground">Provide accurate inputs</span> — give
            truthful, complete information in assessments and profile settings so recommendations
            remain relevant and safe.
          </li>
          <li>
            <span className="font-semibold text-foreground">Use recommendations responsibly</span> —
            apply guidance as informational support only; consult professionals when needed and
            follow product and safety instructions.
          </li>
        </ul>
      </SupportSection>

      <SupportSection
        title="Service Purpose"
        subtitle="AuraSkin AI offers skin analysis and guidance—not medical diagnosis or treatment."
        background="glass4"
        variant="fadeUp"
      >
        <p className="text-muted-foreground font-body text-base leading-relaxed">
          AuraSkin AI offers:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-muted-foreground font-body text-base leading-relaxed">
          <li>
            <span className="font-semibold text-foreground">Skin analysis insights</span> — based on
            your inputs and our AI models, to help you understand your skin profile and options.
          </li>
          <li>
            <span className="font-semibold text-foreground">Personalized guidance</span> — routine and
            product suggestions aligned with your stated goals and context.
          </li>
        </ul>
        <p className="text-muted-foreground font-body text-base leading-relaxed pt-2 font-medium">
          The platform does not provide medical diagnosis, treatment, or prescription advice.
        </p>
      </SupportSection>

      <SupportSection
        title="Limitation of Liability"
        subtitle="AuraSkin AI is not liable for outcomes resulting from misuse of recommendations or circumstances outside our control."
        background="glass3"
        variant="fadeUp"
      >
        <p className="text-muted-foreground font-body text-base leading-relaxed">
          AuraSkin AI is not responsible for outcomes resulting from misuse of recommendations,
          reliance on the platform as a substitute for professional care, or for any indirect,
          incidental, or consequential damages. The service is provided &quot;as is&quot; within the
          scope of these terms. Where the law permits, our liability is limited to the maximum
          extent allowed.
        </p>
      </SupportSection>

      <SupportSection
        title="User Responsibility"
        subtitle="You are responsible for how you apply insights and when you seek professional care."
        background="glass4"
        variant="fadeUp"
      >
        <p className="text-muted-foreground font-body text-base leading-relaxed">
          Users must:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-muted-foreground font-body text-base leading-relaxed">
          <li>
            <span className="font-semibold text-foreground">Apply judgment</span> — use your own
            judgment when following recommendations and consider your full health context.
          </li>
          <li>
            <span className="font-semibold text-foreground">Consult professionals when necessary</span>{" "}
            — seek dermatologists or other qualified healthcare providers for diagnosis, treatment,
            or when you have concerns about your skin or products.
          </li>
        </ul>
      </SupportSection>

      <SupportSection
        title="Account Usage"
        subtitle="You are responsible for maintaining the security of your account and credentials."
        background="glass3"
        variant="fadeUp"
      >
        <p className="text-muted-foreground font-body text-base leading-relaxed">
          Users are responsible for maintaining account security, including keeping login
          credentials confidential and not sharing access with others. You are responsible for
          activity that occurs under your account. If you suspect unauthorized access, notify us and
          take steps to secure your account.
        </p>
      </SupportSection>

      <SupportSection
        title="Service Modifications"
        subtitle="We may update features and offerings over time."
        background="glass4"
        variant="fadeUp"
      >
        <p className="text-muted-foreground font-body text-base leading-relaxed">
          AuraSkin AI may evolve its features, content, and offerings. We may add, change, or
          discontinue functionality with reasonable notice where practical. Continued use after
          changes constitutes acceptance of the updated service within the scope of these terms.
        </p>
      </SupportSection>

      <SupportSection
        title="Termination"
        subtitle="Access may be limited or terminated in case of misuse or violation of these terms."
        background="glass3"
        variant="fadeUp"
      >
        <p className="text-muted-foreground font-body text-base leading-relaxed">
          Access may be limited or terminated in case of misuse, violation of these terms, or for
          other legitimate reasons as we determine. You may also stop using the service at any time.
          Provisions that by their nature should survive (such as limitation of liability and
          dispute resolution) will remain in effect after termination.
        </p>
      </SupportSection>
    </SupportLayout>
  );
}
