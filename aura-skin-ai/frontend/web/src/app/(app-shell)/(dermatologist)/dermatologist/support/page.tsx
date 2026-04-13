"use client";

import { useEffect, useRef, useState } from "react";
import {
  getSupportTickets,
  createSupportTicket,
  type CreateSupportTicketPayload,
} from "@/services/apiPartner";
import { useAuth } from "@/providers/AuthContext";
import type { SupportTicket } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, HelpCircle, Inbox } from "lucide-react";
import Link from "next/link";
import { PanelPageHeader } from "@/components/layouts/PanelPageHeader";
import { PanelSectionReveal } from "@/components/panel/PanelReveal";

const FAQ_LINKS = [
  {
    label: "How to manage consultations",
    href: "/dermatologist/consultations",
  },
  { label: "Updating availability", href: "/dermatologist/availability" },
  { label: "Understanding earnings", href: "/dermatologist/earnings" },
];

export default function DermatologistSupportPage() {
  const { session } = useAuth();
  const partnerId = session?.user?.id ?? "";
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [subject, setSubject] = useState("");
  const [priority, setPriority] =
    useState<CreateSupportTicketPayload["priority"]>("medium");
  const [message, setMessage] = useState("");
  const subjectInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    if (!partnerId) return Promise.resolve();
    return getSupportTickets(partnerId)
      .then(setTickets)
      .catch(() => setTickets([]));
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    load().finally(() => setLoading(false));
  }, [partnerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerId || !subject.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      await createSupportTicket(partnerId, { subject, priority, message });
      setSubject("");
      setMessage("");
      setPriority("medium");
      load();
    } catch {
      setError("Failed to submit ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && tickets.length === 0) {
    return (
      <div className="space-y-6">
        <PanelPageHeader
          title="Support"
          subtitle="Submit tickets or explore common support topics."
        />
        <div className="h-48 rounded-xl border border-border/60 bg-muted/40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PanelPageHeader
        title="Support"
        subtitle="Support ticketing is preview-only and unavailable for production submissions."
      />
      <div className="rounded-lg border border-amber-400/40 bg-amber-100/40 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
        This page is currently informational. Ticket submission and live queue processing are not connected.
      </div>

      <PanelSectionReveal>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> New ticket
            </CardTitle>
            <CardDescription>Priority and file attachment UI preview. Live submission is disabled.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" id="support-form">
              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  ref={subjectInputRef}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description"
                  required
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(v) =>
                    setPriority(v as CreateSupportTicketPayload["priority"])
                  }
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="message">Message *</Label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                File attachment (connect backend).
              </p>
              <Button type="submit" disabled>
                {submitting ? "Submitting…" : "Submit ticket (unavailable)"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <HelpCircle className="h-4 w-4" /> FAQ quick links
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {FAQ_LINKS.map((f) => (
                  <li key={f.href}>
                    <Link
                      href={f.href}
                      className="text-sm text-accent hover:underline"
                    >
                      {f.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading">Support history</CardTitle>
            </CardHeader>
            <CardContent>
              {error && tickets.length === 0 ? (
                <p className="text-muted-foreground text-sm">{error}</p>
              ) : tickets.length === 0 ? (
                <div className="py-10 text-center">
                  <Inbox className="h-12 w-12 text-muted-foreground/60 mx-auto mb-4" />
                  <p className="font-medium text-muted-foreground mb-1">No support tickets yet.</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    If you run into issues, create a ticket and our team will assist you.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => subjectInputRef.current?.focus()}
                  >
                    Create first ticket
                  </Button>
                </div>
              ) : (
                <ul className="space-y-3">
                  {tickets.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0"
                    >
                      <span>
                        {t.subject} · {t.status}
                      </span>
                      <span className="text-muted-foreground">
                        {t.createdAt.slice(0, 10)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </PanelSectionReveal>
    </div>
  );
}

