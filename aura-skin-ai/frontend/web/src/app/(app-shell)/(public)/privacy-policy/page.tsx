"use client";

import { SupportLayout } from "@/components/support/SupportLayout";
import { SupportHero } from "@/components/support/SupportHero";
import { SupportSection } from "@/components/support/SupportSection";

export default function PrivacyPolicyPage() {
  return (
    <SupportLayout>
      <SupportHero
        title="Privacy & Data Protection"
        subtitle="AuraSkin AI is designed with security-first principles to protect your information."
      />

      <SupportSection
        title="Information We Collect"
        subtitle="AuraSkin AI collects the following data to deliver accurate, personalized insights."
        background="glass3"
        variant="fadeUp"
      >
        <ul className="list-disc pl-5 space-y-2 text-muted-foreground font-body text-base leading-relaxed">
          <li>
            <span className="font-semibold text-foreground">Assessment responses</span> — skin type,
            lifestyle inputs, and other answers you provide during the assessment.
          </li>
          <li>
            <span className="font-semibold text-foreground">Profile information</span> — account and
            preference details you choose to share.
          </li>
          <li>
            <span className="font-semibold text-foreground">Interaction data</span> — anonymized or
            aggregated usage data used to improve recommendations and platform accuracy.
          </li>
        </ul>
        <p className="text-muted-foreground font-body text-base leading-relaxed pt-2">
          This information is used only to enhance platform accuracy and your experience.
        </p>
      </SupportSection>

      <SupportSection
        title="How We Use Data"
        subtitle="Collected data supports analysis, recommendations, and platform improvement—never sale of personal information."
        background="glass4"
        variant="fadeUp"
      >
        <p className="text-muted-foreground font-body text-base leading-relaxed">
          Collected data supports:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-muted-foreground font-body text-base leading-relaxed">
          <li>
            <span className="font-semibold text-foreground">AI analysis</span> — to understand your
            skin profile and generate relevant insights.
          </li>
          <li>
            <span className="font-semibold text-foreground">Routine recommendations</span> — to
            deliver personalized, non-diagnostic guidance.
          </li>
          <li>
            <span className="font-semibold text-foreground">Platform performance improvements</span>{" "}
            — to refine the service and user experience over time.
          </li>
        </ul>
        <p className="text-muted-foreground font-body text-base leading-relaxed pt-2 font-medium">
          AuraSkin AI does not sell personal information.
        </p>
      </SupportSection>

      <SupportSection
        title="Data Storage"
        subtitle="All information is stored securely using industry-standard practices."
        background="glass3"
        variant="fadeUp"
      >
        <p className="text-muted-foreground font-body text-base leading-relaxed">
          Security includes:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-muted-foreground font-body text-base leading-relaxed">
          <li>
            <span className="font-semibold text-foreground">Encryption</span> — data is protected in
            transit and at rest where supported by our infrastructure.
          </li>
          <li>
            <span className="font-semibold text-foreground">Restricted access</span> — only
            authorized systems and personnel can access data for defined purposes.
          </li>
          <li>
            <span className="font-semibold text-foreground">Secure processing environments</span> —
            processing occurs in controlled, monitored environments.
          </li>
        </ul>
      </SupportSection>

      <SupportSection
        title="User Rights"
        subtitle="You retain control over your data and how it is used."
        background="glass4"
        variant="fadeUp"
      >
        <p className="text-muted-foreground font-body text-base leading-relaxed">
          Users can:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-muted-foreground font-body text-base leading-relaxed">
          <li>
            <span className="font-semibold text-foreground">Update assessment inputs</span> — change
            profile and assessment details at any time.
          </li>
          <li>
            <span className="font-semibold text-foreground">Request deletion of stored data</span> —
            request removal of your information, subject to legal or operational requirements.
          </li>
          <li>
            <span className="font-semibold text-foreground">Retake assessments anytime</span> —
            run new assessments so insights stay current with your skin and lifestyle.
          </li>
        </ul>
      </SupportSection>

      <SupportSection
        title="Third Party Usage"
        subtitle="We do not share your personal data with third parties without your consent."
        background="glass3"
        variant="fadeUp"
      >
        <p className="text-muted-foreground font-body text-base leading-relaxed">
          AuraSkin AI does not share personal data with third parties for marketing or other
          purposes without your explicit consent. Where we use service providers to operate the
          platform, we ensure they are bound by appropriate data protection and confidentiality
          obligations.
        </p>
      </SupportSection>

      <SupportSection
        title="Policy Updates"
        subtitle="Our privacy practices may evolve as we improve the platform."
        background="glass4"
        variant="fadeUp"
      >
        <p className="text-muted-foreground font-body text-base leading-relaxed">
          Privacy policies may evolve with platform improvements, legal requirements, or best
          practices. We will communicate material changes through the platform or by other
          appropriate means. Continued use of AuraSkin AI after updates constitutes acceptance of
          the revised policy where permitted by law.
        </p>
      </SupportSection>
    </SupportLayout>
  );
}
