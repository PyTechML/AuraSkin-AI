"use client";

import { StaggerChildren, StaggerItem } from "@/components/landing/ScrollReveal";
import { SupportLayout } from "@/components/support/SupportLayout";
import { SupportHero } from "@/components/support/SupportHero";
import { SupportSection } from "@/components/support/SupportSection";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Clock, Handshake } from "lucide-react";

export default function HelpPage() {
  return (
    <SupportLayout>
      <SupportHero
        title="Support Center"
        subtitle="Guidance to help you understand assessments, recommendations, and platform usage."
      />

      <SupportSection
        title="Getting Started"
        subtitle="Learn how to move from your first assessment to an actionable routine that fits your day-to-day life."
        background="glass3"
      >
        <StaggerChildren className="grid gap-6 md:grid-cols-3" stagger={0.12}>
          <StaggerItem>
            <Card className="h-full">
              <CardContent className="pt-6 space-y-3">
                <h3 className="font-heading text-lg font-semibold">How to complete an assessment</h3>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">
                  Start your assessment from the dashboard, answer each question honestly about your
                  skin type, lifestyle, and concerns, then review your inputs before submitting.
                  Most users finish in under five minutes.
                </p>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="h-full">
              <CardContent className="pt-6 space-y-3">
                <h3 className="font-heading text-lg font-semibold">
                  How recommendations are generated
                </h3>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">
                  AuraSkin AI processes your answers using dermatology-informed logic and
                  pattern-based analysis. The system looks for interactions between skin type,
                  environment, and concerns to prioritize safe, targeted steps.
                </p>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="h-full">
              <CardContent className="pt-6 space-y-3">
                <h3 className="font-heading text-lg font-semibold">How to track progress</h3>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">
                  Reassess periodically as your skin or lifestyle changes. Comparing assessments
                  over time helps you see trends, adjust routines, and understand what&apos;s
                  working for you.
                </p>
              </CardContent>
            </Card>
          </StaggerItem>
        </StaggerChildren>
      </SupportSection>

      <SupportSection
        title="Troubleshooting"
        subtitle="If something doesn&apos;t behave as expected, these steps can help you get back on track."
        background="glass4"
        variant="fadeUp"
      >
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="h-full">
            <CardContent className="pt-6 space-y-3">
              <h3 className="font-heading text-lg font-semibold">If an assessment fails</h3>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">
                Check your connection, refresh the page, and try again. If the issue continues,
                capture a screenshot if possible and contact support so we can investigate.
              </p>
            </CardContent>
          </Card>
          <Card className="h-full">
            <CardContent className="pt-6 space-y-3">
              <h3 className="font-heading text-lg font-semibold">If results seem unexpected</h3>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">
                Revisit your inputs for accuracy, especially around skin sensitivity and active
                concerns. You can retake the assessment, and you should always defer to a
                dermatologist if results conflict with professional guidance.
              </p>
            </CardContent>
          </Card>
          <Card className="h-full">
            <CardContent className="pt-6 space-y-3">
              <h3 className="font-heading text-lg font-semibold">How to update inputs</h3>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">
                Navigate to your profile to adjust details like skin type, lifestyle habits, or
                current treatments. Updating these inputs helps AuraSkin AI keep recommendations
                relevant to your current reality.
              </p>
            </CardContent>
          </Card>
        </div>
      </SupportSection>

      <SupportSection
        title="Account Help"
        subtitle="Manage access, profile information, and assessments from a single place."
        background="glass3"
      >
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="h-full">
            <CardContent className="pt-6 space-y-3">
              <h3 className="font-heading text-lg font-semibold">Resetting login</h3>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">
                Use the &ldquo;Forgot password&rdquo; option on the sign-in screen to receive a
                secure reset link. If you no longer have access to your email, reach out to support
                for next steps.
              </p>
            </CardContent>
          </Card>
          <Card className="h-full">
            <CardContent className="pt-6 space-y-3">
              <h3 className="font-heading text-lg font-semibold">Updating profile</h3>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">
                Within your account settings, you can update basic details, preferences, and
                certain assessment-related fields. Keeping this information current helps improve
                recommendation quality.
              </p>
            </CardContent>
          </Card>
          <Card className="h-full">
            <CardContent className="pt-6 space-y-3">
              <h3 className="font-heading text-lg font-semibold">Retaking assessment</h3>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">
                You can retake the assessment whenever your skin, products, or environment change.
                New insights will replace prior results so your routine stays aligned with what your
                skin needs now.
              </p>
            </CardContent>
          </Card>
        </div>
      </SupportSection>

      <SupportSection
        title="Contact Support"
        subtitle="If you need additional help, our team is here to support you."
        background="glass4"
        variant="fadeUp"
      >
        <StaggerChildren className="grid gap-6 md:grid-cols-3" stagger={0.12}>
          <StaggerItem>
            <Card className="h-full">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/60">
                    <Mail className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </div>
                  <h3 className="font-heading text-lg font-semibold">Email Support</h3>
                </div>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">
                  Reach us at{" "}
                  <a
                    href="mailto:support@auraskin.ai"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    support@auraskin.ai
                  </a>{" "}
                  for account, assessment, or technical questions.
                </p>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="h-full">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/60">
                    <Clock className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </div>
                  <h3 className="font-heading text-lg font-semibold">Response time</h3>
                </div>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">
                  We typically respond within 24–48 hours, excluding weekends and major holidays.
                  For urgent medical concerns, please contact a healthcare professional directly.
                </p>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="h-full">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/60">
                    <Handshake className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </div>
                  <h3 className="font-heading text-lg font-semibold">Partnership inquiries</h3>
                </div>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">
                  For clinical collaborations or product partnerships, email{" "}
                  <a
                    href="mailto:partners@auraskin.ai"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    partners@auraskin.ai
                  </a>
                  .
                </p>
              </CardContent>
            </Card>
          </StaggerItem>
        </StaggerChildren>
      </SupportSection>
    </SupportLayout>
  );
}
