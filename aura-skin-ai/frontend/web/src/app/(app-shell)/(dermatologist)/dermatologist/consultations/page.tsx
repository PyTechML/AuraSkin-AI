"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthContext";
import {
  approveDermatologistConsultation,
  getDermatologistConsultations,
  rejectDermatologistConsultation,
} from "@/services/apiPartner";
import type { NormalizedConsultation } from "@/types/consultation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Calendar, ChevronRight, Clock, User } from "lucide-react";
import { usePanelToast } from "@/components/panel/PanelToast";
import { CardSkeleton } from "@/components/ui/skeleton-primitives";
import { PanelPageHeader } from "@/components/layouts/PanelPageHeader";
import { PanelSectionReveal } from "@/components/panel/PanelReveal";
import {
  isDocumentVisible,
  PANEL_LIVE_POLL_INTERVAL_MS,
  takeFreshList,
} from "@/lib/panelPolling";

type TabKey = "pending" | "upcoming" | "completed" | "cancelled";

export default function DermatologistConsultationsPage() {
  const { session } = useAuth();
  const partnerId = session?.user?.id;
  const { addToast } = usePanelToast();
  const [consultations, setConsultations] = useState<NormalizedConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [actingId, setActingId] = useState<string | null>(null);
  const [actingKind, setActingKind] = useState<"approve" | "reject" | null>(null);

  const loadConsultations = useCallback(
    async (silent: boolean) => {
      if (!partnerId) {
        setConsultations([]);
        if (!silent) setLoading(false);
        return;
      }
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const data = await getDermatologistConsultations();
        const items = Array.isArray(data) ? data : [];
        setConsultations((prev) => (silent ? takeFreshList(prev, items) : items));
      } catch {
        if (!silent) setError("Failed to load consultations.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [partnerId]
  );

  useEffect(() => {
    void loadConsultations(false);
  }, [partnerId, loadConsultations]);

  useEffect(() => {
    if (!partnerId) return;
    const id = window.setInterval(() => {
      if (!isDocumentVisible()) return;
      void loadConsultations(true);
    }, PANEL_LIVE_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [partnerId, loadConsultations]);

  const runApprove = useCallback(
    async (id: string) => {
      setActingId(id);
      setActingKind("approve");
      try {
        const updated = await approveDermatologistConsultation(id);
        if (updated) {
          addToast("Confirmed — patient notified.", "success");
          await loadConsultations(false);
        } else {
          addToast("Could not confirm.", "error");
        }
      } catch {
        addToast("Could not confirm.", "error");
      } finally {
        setActingId(null);
        setActingKind(null);
      }
    },
    [addToast, loadConsultations]
  );

  const runReject = useCallback(
    async (id: string) => {
      if (
        !window.confirm("Decline this request? The slot will be released.")
      ) {
        return;
      }
      setActingId(id);
      setActingKind("reject");
      try {
        const updated = await rejectDermatologistConsultation(id);
        if (updated) {
          addToast("Consultation declined.", "success");
          await loadConsultations(false);
        } else {
          addToast("Could not decline.", "error");
        }
      } catch {
        addToast("Could not decline.", "error");
      } finally {
        setActingId(null);
        setActingKind(null);
      }
    },
    [addToast, loadConsultations]
  );

  const grouped = useMemo(() => {
    const safeConsultations = Array.isArray(consultations) ? consultations : [];
    const sorted = safeConsultations.slice().sort((a, b) => {
      const aDate = new Date(`${a.date ?? ""}T${a.timeSlot ?? ""}`).getTime();
      const bDate = new Date(`${b.date ?? ""}T${b.timeSlot ?? ""}`).getTime();
      return (Number(bDate) || 0) - (Number(aDate) || 0);
    });
    const pending = sorted.filter((c) => c.status === "pending");
    const upcoming = sorted.filter((c) => c.status === "confirmed");
    const completed = sorted.filter((c) => c.status === "completed");
    const cancelled = sorted.filter((c) => c.status === "cancelled");
    return { pending, upcoming, completed, cancelled };
  }, [consultations]);

  const listForTab = (tab: TabKey) => grouped[tab];

  if (loading) {
    return (
      <div className="space-y-6">
        <PanelPageHeader
          title="Consultations"
          subtitle="Review and respond to consultation requests efficiently."
        />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <CardSkeleton key={i} height="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (error && consultations.length === 0) {
    return (
      <div className="space-y-6">
        <PanelPageHeader
          title="Consultations"
          subtitle="Review and respond to consultation requests efficiently."
        />
        <Card className="border-border max-w-md">
          <CardContent className="py-6">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button
              variant="outline"
              onClick={() => {
                void loadConsultations(false);
              }}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PanelPageHeader
        title="Consultations"
        subtitle="Review and respond to consultation requests efficiently."
      />

      <p className="text-sm text-muted-foreground">
        Open a consultation for clinical notes. For pending requests, use Approve to confirm (patient gets an in-app notification) or Decline to release the slot.
      </p>
      <PanelSectionReveal>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>
        {(["pending", "upcoming", "completed", "cancelled"] as TabKey[]).map(
          (tab) => {
            const items = listForTab(tab);
            const tabDescriptions: Record<TabKey, string> = {
              pending: "Requests awaiting your review and decision.",
              upcoming: "Confirmed consultations scheduled for future dates.",
              completed: "Consultations you have already completed.",
              cancelled: "Requests or appointments that were cancelled.",
            };
            const emptyMessages: Record<TabKey, string> = {
              pending: "No consultations yet",
              upcoming: "No upcoming consultations scheduled.",
              completed: "No completed consultations yet.",
              cancelled: "No cancelled consultations.",
            };
            return (
              <TabsContent key={tab} value={tab} className="mt-4 space-y-4">
                <p className="text-xs text-muted-foreground">{tabDescriptions[tab]}</p>
                {items.length === 0 ? (
                  <Card className="border-border">
                    <CardContent className="py-8 text-center text-muted-foreground">
                      {emptyMessages[tab]}
                    </CardContent>
                  </Card>
                ) : (
                  items.map((b) => {
                    const cid = (b.id ?? "").trim();
                    const busy = actingId === cid;
                    return (
                    <Card
                      key={b.id ?? `${b.patientId ?? "patient"}-${b.date ?? ""}-${b.timeSlot ?? ""}`}
                      className="border-border partner-card-hover"
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              <User className="h-4 w-4" />
                              {String(b.patientName ?? "").trim() || "Unknown patient"}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                              <Calendar className="h-3 w-3" /> {(b.date ?? "").trim() || "-"} ·{" "}
                              <Clock className="h-3 w-3" /> {(b.timeSlot ?? "").trim() || "-"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant={
                                b.status === "pending"
                                  ? "warning"
                                  : b.status === "confirmed"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {(b.status ?? "").trim() || "pending"}
                            </Badge>
                            {cid ? (
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/dermatologist/consultations/${encodeURIComponent(cid)}`}>
                                  Open
                                  <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                                </Link>
                              </Button>
                            ) : null}
                            {tab === "pending" && b.status === "pending" && cid ? (
                              <>
                                <Button
                                  size="sm"
                                  disabled={busy}
                                  onClick={() => void runApprove(cid)}
                                >
                                  {busy && actingKind === "approve" ? "…" : "Approve"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busy}
                                  onClick={() => void runReject(cid)}
                                >
                                  {busy && actingKind === "reject" ? "…" : "Decline"}
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                  })
                )}
              </TabsContent>
            );
          }
        )}
      </Tabs>
      </PanelSectionReveal>
    </div>
  );
}

