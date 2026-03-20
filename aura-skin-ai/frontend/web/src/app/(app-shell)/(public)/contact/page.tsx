"use client";

import { motion } from "framer-motion";
import {
  SectionReveal,
  StaggerChildren,
  StaggerItem,
} from "@/components/landing/ScrollReveal";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Handshake, Clock, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { submitContact } from "@/services/api";

const CONTACT_CARDS = [
  {
    title: "Support",
    value: "support@auraskin.ai",
    href: "mailto:support@auraskin.ai",
    icon: Mail,
  },
  {
    title: "Partnerships",
    value: "partners@auraskin.ai",
    href: "mailto:partners@auraskin.ai",
    icon: Handshake,
  },
  {
    title: "Response Time",
    value: "24–48 hour turnaround",
    href: null,
    icon: Clock,
  },
] as const;

type ContactFormValues = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<ContactFormValues>({
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });

  const onSubmit = async (data: ContactFormValues) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await submitContact({
        name: data.name,
        email: data.email,
        subject: data.subject || undefined,
        message: data.message,
      });
      setSubmitted(true);
      form.reset();
    } catch {
      setSubmitError("Something went wrong. Please try again or email us directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background text-foreground">
      {/* Section 1 — Hero */}
      <section className="relative min-h-[55vh] flex flex-col items-center justify-center px-4 py-28 overflow-hidden bg-glass-4">
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          aria-hidden
        >
          <div
            className="w-[380px] h-[280px] rounded-full blur-[90px] opacity-80"
            style={{
              background:
                "radial-gradient(ellipse, rgba(137,108,108,0.14) 0%, rgba(229,190,181,0.06) 50%, transparent 65%)",
            }}
          />
        </div>
        <div className="relative z-10 w-full max-w-3xl mx-auto text-center">
          <motion.h1
            className="font-heading text-4xl md:text-5xl font-semibold tracking-tight text-foreground"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            Let&apos;s Connect
          </motion.h1>
          <motion.p
            className="mt-5 text-muted-foreground font-body text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7, ease: "easeOut" }}
          >
            Reach out to AuraSkin AI for support, partnerships, or platform
            inquiries.
          </motion.p>
        </div>
      </section>

      <div className="h-px bg-border/40" />

      {/* Section 2 — Contact options */}
      <section className="py-24 px-4 bg-background">
        <div className="container max-w-4xl mx-auto">
          <StaggerChildren
            className="grid md:grid-cols-3 gap-6"
            stagger={0.12}
          >
            {CONTACT_CARDS.map(({ title, value, href, icon: Icon }) => (
              <StaggerItem key={title}>
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60">
                        <Icon
                          className="h-5 w-5 text-muted-foreground"
                          aria-hidden
                        />
                      </div>
                      <CardTitle className="font-heading text-xl font-semibold !mt-0">
                        {title}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {href ? (
                      <a
                        href={href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                      >
                        {value}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground font-body">
                        {value}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      <div className="h-px bg-border/40" />

      {/* Section 3 — Contact form */}
      <section className="py-24 px-4 bg-glass-3">
        <SectionReveal
          variant="slideUp"
          className="container max-w-xl mx-auto"
        >
          <h2 className="font-heading text-3xl md:text-4xl font-semibold mb-6 text-foreground">
            Send Us A Message
          </h2>
          {submitted ? (
            <p className="text-muted-foreground font-body text-lg animate-in fade-in duration-200">
              Thank you. We&apos;ll get back to you within 24–48 hours.
            </p>
          ) : (
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-5"
            >
              {submitError && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {submitError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="contact-name">Name</Label>
                <Input
                  id="contact-name"
                  placeholder="Your name"
                  {...form.register("name", { required: "Name is required" })}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  placeholder="you@example.com"
                  {...form.register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Please enter a valid email",
                    },
                  })}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-subject">Subject</Label>
                <Input
                  id="contact-subject"
                  placeholder="Subject"
                  {...form.register("subject", { required: "Subject is required" })}
                />
                {form.formState.errors.subject && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.subject.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-message">Message</Label>
                <textarea
                  id="contact-message"
                  rows={5}
                  placeholder="Your message"
                  className={cn(
                    "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[120px] resize-y"
                  )}
                  {...form.register("message", { required: "Message is required" })}
                />
                {form.formState.errors.message && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.message.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                size="lg"
                className="rounded-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Sending…
                  </>
                ) : (
                  "Submit Inquiry"
                )}
              </Button>
            </form>
          )}
        </SectionReveal>
      </section>

      <div className="h-px bg-border/40" />

      {/* Section 4 — Location */}
      <section className="py-24 px-4 bg-background">
        <SectionReveal
          variant="fadeOnly"
          className="container max-w-4xl mx-auto text-left"
        >
          <h2 className="font-heading text-3xl md:text-4xl font-semibold mb-6 text-foreground">
            Our Presence
          </h2>
          <div className="aspect-video w-full max-w-3xl rounded-2xl border border-border/60 overflow-hidden bg-muted/40">
            <iframe
              title="AuraSkin AI — map"
              src="https://www.openstreetmap.org/export/embed.html?bbox=-122.45%2C37.76%2C-122.38%2C37.81&layer=mapnik&marker=37.785%2C-122.42"
              className="w-full h-full border-0 block"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <p className="mt-6 text-muted-foreground font-body text-lg leading-relaxed max-w-2xl">
            AuraSkin AI operates globally with digital-first infrastructure.
          </p>
        </SectionReveal>
      </section>

      <div className="h-px bg-border/40" />

      {/* Section 5 — Trust */}
      <section className="py-24 px-4 bg-glass-3">
        <SectionReveal
          variant="fadeUp"
          className="container max-w-3xl mx-auto text-center"
        >
          <h2 className="font-heading text-3xl md:text-4xl font-semibold mb-6 text-foreground">
            Why Contact Us
          </h2>
          <p className="text-muted-foreground font-body text-lg leading-relaxed">
            AuraSkin AI collaborates with dermatology experts and partner
            networks to deliver clinically aligned recommendations.
          </p>
        </SectionReveal>
      </section>
    </div>
  );
}
