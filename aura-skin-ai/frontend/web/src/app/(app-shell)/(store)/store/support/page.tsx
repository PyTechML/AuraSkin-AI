"use client";

import { useEffect, useRef, useState } from "react";
import {
  getSupportTickets,
  createSupportTicket,
  type CreateSupportTicketPayload,
} from "@/services/apiPartner";
import { useAuth } from "@/providers/AuthProvider";
import { usePanelToast } from "@/components/panel/PanelToast";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, HelpCircle, Ticket, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Breadcrumb } from "@/components/layouts/Breadcrumb";
import { PanelStagger, PanelStaggerItem } from "@/components/panel/PanelReveal";
import { PanelEmptyState } from "@/components/panel/PanelEmptyState";
import { cn } from "@/lib/utils";

const FAQ_LINKS = [
  { label: "How to update order status", href: "/store/orders", description: "Change order status and tracking." },
  { label: "Managing inventory", href: "/store/inventory", description: "Add products and stock levels." },
  { label: "Payout schedule", href: "/store/payouts", description: "When and how you get paid." },
];

const OPEN_STATUSES = ["open", "in_progress"];

export default function StoreSupportPage() {
  const { session } = useAuth();
  const partnerId = session?.user?.id ?? "";
  const { addToast } = usePanelToast();
  const ticketHistoryRef = useRef<HTMLDivElement>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [subject, setSubject] = useState("");
  const [priority, setPriority] =
    useState<CreateSupportTicketPayload["priority"]>("medium");
  const [message, setMessage] = useState("");
  const [subjectTouched, setSubjectTouched] = useState(false);
  const [messageTouched, setMessageTouched] = useState(false);

  const load = () => {
    if (!partnerId) return Promise.resolve();
    return getSupportTickets(partnerId)
      .then(setTickets)
      .catch(() => setError("Failed to load tickets."));
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    load().finally(() => setLoading(false));
  }, [partnerId]);

  const openCount = tickets.filter((t) => OPEN_STATUSES.includes(t.status)).length;
  const resolvedCount = tickets.filter(
    (t) => t.status === "resolved" || t.status === "closed"
  ).length;
  const withUpdates = tickets.filter((t) => t.updatedAt && t.createdAt);
  const avgResponseTime =
    withUpdates.length > 0
      ? withUpdates.reduce((acc, t) => {
          const created = new Date(t.createdAt).getTime();
          const updated = new Date(t.updatedAt).getTime();
          return acc + (updated - created) / (1000 * 60 * 60);
        }, 0) / withUpdates.length
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubjectTouched(true);
    setMessageTouched(true);
    if (!partnerId || !subject.trim() || !message.trim()) {
      if (!subject.trim() || !message.trim()) {
        addToast("Please fill subject and message.", "error");
      }
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createSupportTicket(partnerId, { subject, priority, message });
      setSubject("");
      setMessage("");
      setPriority("medium");
      setSubjectTouched(false);
      setMessageTouched(false);
      await load();
      addToast("Ticket submitted. We'll respond within 1–2 business days.");
      ticketHistoryRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch {
      setError("Failed to submit ticket.");
      addToast("Failed to submit ticket.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && tickets.length === 0) {
    return (
      <div className="space-y-8">
        <Breadcrumb />
        <div className="space-y-2">
          <div className="h-8 w-48 rounded bg-muted/60 animate-pulse" />
          <div className="h-5 w-80 rounded bg-muted/40 animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl border border-border/60 bg-muted/40 animate-pulse"
            />
          ))}
        </div>
        <div className="h-64 rounded-xl border border-border/60 bg-muted/40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <Breadcrumb />

      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold">Contact support</h1>
        <p className="text-muted-foreground">
          Support ticketing is in preview mode and currently unavailable for production submissions.
        </p>
      </div>
      <div className="rounded-lg border border-amber-400/40 bg-amber-100/40 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
        Ticket creation and SLA metrics shown below are preview-only until backend support services are enabled.
      </div>

      <PanelStagger className="grid gap-4 md:grid-cols-3">
        <PanelStaggerItem>
          <Card className="border-border partner-card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm text-muted-foreground flex items-center gap-2">
                <Ticket className="h-4 w-4" /> Open tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{openCount}</p>
            </CardContent>
          </Card>
        </PanelStaggerItem>
        <PanelStaggerItem>
          <Card className="border-border partner-card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm text-muted-foreground">
                Resolved tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{resolvedCount}</p>
            </CardContent>
          </Card>
        </PanelStaggerItem>
        <PanelStaggerItem>
          <Card className="border-border partner-card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm text-muted-foreground">
                Avg response time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {avgResponseTime != null && avgResponseTime > 0
                  ? `${Math.round(avgResponseTime)}h`
                  : "N/A"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Based on ticket history
              </p>
            </CardContent>
          </Card>
        </PanelStaggerItem>
      </PanelStagger>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> New ticket
            </CardTitle>
            <CardDescription>Priority and file attachment (UI).</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  onBlur={() => setSubjectTouched(true)}
                  placeholder="Brief description"
                  className={cn(
                    subjectTouched && !subject.trim() && "border-destructive/60"
                  )}
                />
                {subjectTouched && !subject.trim() && (
                  <p className="text-xs text-destructive mt-1">Subject is required.</p>
                )}
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
                  onBlur={() => setMessageTouched(true)}
                  className={cn(
                    "flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                    messageTouched && !message.trim() && "border-destructive/60"
                  )}
                />
                {messageTouched && !message.trim() && (
                  <p className="text-xs text-destructive mt-1">Message is required.</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                File attachment (connect backend).
              </p>
              <Button type="submit" disabled>
                {submitting ? (
                  <>
                    <span className="animate-spin mr-2 inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent" />
                    Submitting…
                  </>
                ) : (
                  "Submit ticket (unavailable)"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2 text-base">
                <HelpCircle className="h-4 w-4" /> FAQ quick links
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {FAQ_LINKS.map((f) => (
                  <li key={f.href}>
                    <Link
                      href={f.href}
                      className="text-sm text-accent hover:underline font-medium"
                    >
                      {f.label}
                    </Link>
                    {f.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm">Support status</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>Live response SLA is not available yet. Use your internal escalation channel for urgent issues.</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Platform notice
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>Live incident status feed is not connected in this environment.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div ref={ticketHistoryRef}>
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading text-base">Ticket history</CardTitle>
            <CardDescription>
              Tickets are ordered from newest to oldest. Closed tickets remain visible for 90 days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && tickets.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">{error}</p>
            ) : tickets.length === 0 ? (
              <PanelEmptyState
                icon={<MessageSquare className="h-12 w-12" />}
                title="No tickets yet"
                description="Create your first ticket above and we'll get back to you."
                action={
                  <Button variant="outline" size="sm" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                    New ticket
                  </Button>
                }
              />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Last updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.subject}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {t.createdAt.slice(0, 10)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              t.status === "resolved" || t.status === "closed"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {t.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{t.priority}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {t.updatedAt?.slice(0, 10) ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="text-xs text-muted-foreground mt-3">
                  Tickets are ordered from newest to oldest. Closed tickets remain visible for 90 days.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
