import Link from "next/link";
import dynamic from "next/dynamic";
import { ImageIcon, ChevronRight, Sparkles, ShieldCheck, HelpCircle } from "lucide-react";
import { getDermatologistById } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";

const RecommendedApproachWithInlineBooking = dynamic(
  () =>
    import("@/components/consultations/InlineBookingSection").then(
      (m) => m.RecommendedApproachWithInlineBooking
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="rounded-xl border border-border/50 bg-muted/20 p-5 h-36 animate-pulse"
        aria-hidden
      />
    ),
  }
);
import { Button } from "@/components/ui/button";

export default async function DermatologistPage({ params }: { params: { id: string } }) {
  let dermatologist: Awaited<ReturnType<typeof getDermatologistById>> = null;
  try {
    dermatologist = await getDermatologistById(params.id);
  } catch {
    dermatologist = null;
  }

  if (!dermatologist) {
    return (
      <div className="bg-background text-foreground min-h-[60vh] w-full flex flex-col items-center justify-center px-4 py-12">
        <Card className="max-w-md w-full border-border">
          <CardContent className="py-12 text-center space-y-4">
            <h1 className="font-heading text-xl font-semibold text-foreground">
              Unable to load profile. Try again.
            </h1>
            <p className="text-sm text-muted-foreground font-body">
              We couldn&apos;t load this dermatologist&apos;s profile. Please try again or browse other dermatologists.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link href="/dermatologists">Browse dermatologists</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/dashboard/dermatologists/${params.id}`}>Try again</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const experienceLabel =
    dermatologist.yearsExperience !== undefined
      ? `${dermatologist.yearsExperience}+ years in practice`
      : "Experienced, board-qualified dermatologist";

  const expertiseTags = dermatologist.expertiseTags ?? [];
  const availability = dermatologist.availability ?? "Currently accepting new consultation requests.";
  const aiMatchReason =
    dermatologist.aiMatchReason ??
    "Recommended based on your recent assessment results and current skin priorities.";

  return (
    <div className="bg-background text-foreground min-h-[60vh] w-full">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Breadcrumb */}
        <nav className="mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm font-label text-muted-foreground">
            <li>
              <Link href="/dashboard" className="hover:text-foreground transition-colors">
                Dashboard
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </li>
            <li className="text-foreground truncate max-w-[200px] sm:max-w-none" aria-current="page">
              {dermatologist.name}
            </li>
          </ol>
        </nav>

        {/* Three-area: image, details, sidebar — aligned with product detail layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 mb-16">
          {/* Left: portrait placeholder */}
          <div className="lg:col-span-5">
            <div
              className="relative w-full aspect-[4/3] lg:aspect-square max-h-[480px] lg:max-h-none bg-muted/80 overflow-hidden rounded-2xl border border-border"
              aria-hidden
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                <ImageIcon className="h-16 w-16 text-muted-foreground/60" aria-hidden />
                <span className="text-sm font-label text-muted-foreground/80">Dermatologist profile</span>
              </div>
            </div>
          </div>

          {/* Center: doctor info and AI match reason */}
          <div className="lg:col-span-4 flex flex-col">
            <span className="inline-block text-xs font-label text-accent bg-accent/10 border border-accent/20 rounded-full px-3 py-1 mb-3 w-fit">
              {dermatologist.specialty}
            </span>
            <h1 className="font-heading text-2xl md:text-3xl font-semibold text-foreground tracking-tight mb-3">
              {dermatologist.name}
            </h1>
            <p className="text-muted-foreground font-body leading-relaxed text-[15px] mb-3">
              {experienceLabel}
            </p>
            <p className="text-sm font-label text-muted-foreground/90 mb-6">
              AI Match Reason:{" "}
              <span className="text-foreground/90 font-normal">
                {aiMatchReason}
              </span>
            </p>
            {expertiseTags.length > 0 && (
              <div className="space-y-2 mb-6">
                <h2 className="font-heading text-base font-semibold text-foreground">Expertise</h2>
                <div className="flex flex-wrap gap-2">
                  {expertiseTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full border border-border/60 bg-muted/60 px-2.5 py-0.5 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2 mb-6">
              <h2 className="font-heading text-base font-semibold text-foreground">Recommended approach</h2>
              <p className="text-sm font-body text-muted-foreground/80">
                This dermatologist focuses on building sustainable, evidence-based routines tailored to your
                assessment results, prioritizing barrier support, gradual active introduction, and ongoing progress
                tracking.
              </p>
            </div>
          </div>

          {/* Right: availability and reassurance */}
          <div className="lg:col-span-3 flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border/60 bg-muted/10 p-5 lg:p-6 space-y-3">
              <h3 className="font-heading text-sm font-semibold text-foreground uppercase tracking-wide">
                Consultation availability
              </h3>
              <p className="text-sm font-body text-muted-foreground">{availability}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/10 p-5 lg:p-6 space-y-4">
              <h3 className="font-heading text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" aria-hidden />
                Why this match
              </h3>
              <p className="text-sm font-body text-muted-foreground leading-relaxed">
                Your AI assessment highlighted patterns in your skin concerns. This dermatologist&apos;s expertise
                and focus areas align closely with those findings.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/10 p-5 lg:p-6">
              <h3 className="font-heading text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2 mb-2">
                <ShieldCheck className="h-4 w-4 text-accent" aria-hidden />
                Working with AuraSkin
              </h3>
              <p className="text-sm font-body text-muted-foreground leading-relaxed">
                Dermatologists in the AuraSkin network use your AI-powered reports to guide recommendations, making
                consults more focused and efficient.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/10 p-5 lg:p-6">
              <h3 className="font-heading text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2 mb-3">
                <HelpCircle className="h-4 w-4 text-accent" aria-hidden />
                Questions before you book?
              </h3>
              <p className="text-sm font-body text-muted-foreground leading-relaxed">
                You can always return to your dashboard to review your reports or adjust your routine before
                confirming a consultation.
              </p>
            </div>
          </div>
        </div>

        {/* Detail structure aligned with product detail sections */}
        <section className="rounded-2xl border border-border/60 bg-muted/20 px-6 py-8 md:px-8 md:py-10 mb-12 w-full">
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            Profile details
          </h2>
          <p className="text-sm text-muted-foreground font-body mb-6">
            Learn more about this dermatologist&apos;s background, expertise, and how they typically approach
            care for concerns like yours.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
            {/* Doctor info (Product Info → Doctor Info) */}
            <div className="lg:col-span-1 space-y-4">
              <div>
                <h3 className="font-heading text-base font-semibold text-foreground mb-3">
                  Doctor info
                </h3>
                <dl className="space-y-2 text-sm font-body text-muted-foreground">
                  <div>
                    <dt className="font-label text-muted-foreground/80">Name</dt>
                    <dd className="text-foreground font-medium mt-0.5">{dermatologist.name}</dd>
                  </div>
                  <div>
                    <dt className="font-label text-muted-foreground/80">Specialization</dt>
                    <dd className="text-foreground font-medium mt-0.5">{dermatologist.specialty}</dd>
                  </div>
                  <div>
                    <dt className="font-label text-muted-foreground/80">Experience</dt>
                    <dd className="text-foreground font-medium mt-0.5">{experienceLabel}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Expertise (Ingredients → Expertise) */}
            <div className="space-y-4">
              <div>
                <h3 className="font-heading text-base font-semibold text-foreground mb-3">
                  Expertise
                </h3>
                {expertiseTags.length > 0 ? (
                  <ul className="list-disc list-outside pl-5 text-muted-foreground font-body space-y-2 text-[15px]">
                    {expertiseTags.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground font-body leading-relaxed text-[15px]">
                    This dermatologist works across a range of common skin concerns, tailoring treatments to your
                    specific skin type and history.
                  </p>
                )}
              </div>
            </div>

            {/* Recommended approach (Usage → Recommended Approach) + Book CTA */}
            <RecommendedApproachWithInlineBooking
              dermatologistId={dermatologist.id}
              dermatologistName={dermatologist.name}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

