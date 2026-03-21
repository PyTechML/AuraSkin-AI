"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { getDermatologistConsultations } from "@/services/apiPartner";
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
import { Calendar, Clock, User } from "lucide-react";
import { CardSkeleton } from "@/components/ui/skeleton-primitives";
import { PanelPageHeader } from "@/components/layouts/PanelPageHeader";
import { PanelSectionReveal } from "@/components/panel/PanelReveal";

type TabKey = "pending" | "upcoming" | "completed" | "cancelled";

export default function DermatologistConsultationsPage() {
  const { session } = useAuth();
  const partnerId = session?.user?.id;
  const [consultations, setConsultations] = useState<NormalizedConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("pending");

  const load = () => {
    if (!partnerId) return;
    getDermatologistConsultations()
      .then((data) => {
        const items = Array.isArray(data) ? data : [];
        setConsultations(items);
      })
      .catch(() => setError("Failed to load consultations."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    load();
  }, [partnerId]);

  const grouped = useMemo(() => {
    const pending = consultations.filter((c) => c.status === "pending");
    const upcoming = consultations.filter((c) => c.status === "confirmed");
    const completed = consultations.filter((c) => c.status === "completed");
    const cancelled = consultations.filter((c) => c.status === "cancelled");
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
                setLoading(true);
                load();
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
        Use tabs to switch between pending, upcoming, completed, and cancelled consultations. Status badges reflect the latest state of each consultation.
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
              pending: "No pending consultations. New patient requests will appear here.",
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
                  items.map((b) => (
                    <Card key={b.id} className="border-border partner-card-hover">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              <User className="h-4 w-4" />
                              {`Patient ${b.patientId || "Unknown"}`}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                              <Calendar className="h-3 w-3" /> {b.date} ·{" "}
                              <Clock className="h-3 w-3" /> {b.timeSlot}
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
                              {b.status}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
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

