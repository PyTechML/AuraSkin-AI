"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import {
  getBookingsForPartner,
  updateBookingStatus,
  rescheduleBooking,
} from "@/services/apiPartner";
import type { ConsultationBooking } from "@/types";
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
  const partnerId = session?.user?.id ?? "";
  const [bookings, setBookings] = useState<ConsultationBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("pending");

  const load = () => {
    if (!partnerId) return;
    getBookingsForPartner(partnerId)
      .then(setBookings)
      .catch(() => setError("Failed to load consultations."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    load();
  }, [partnerId]);

  const grouped = useMemo(() => {
    const pending = bookings.filter((b) => b.status === "pending");
    const upcoming = bookings.filter(
      (b) =>
        b.status === "accepted" ||
        b.status === "rescheduled"
    );
    const completed = bookings.filter((b) => b.status === "completed");
    const cancelled = bookings.filter(
      (b) => b.status === "cancelled" || b.status === "declined"
    );
    return { pending, upcoming, completed, cancelled };
  }, [bookings]);

  const handleStatus = async (
    id: string,
    status: ConsultationBooking["status"]
  ) => {
    try {
      await updateBookingStatus(id, status);
      load();
    } catch {
      setError("Failed to update consultation.");
    }
  };

  const handleReschedule = async (booking: ConsultationBooking) => {
    // Demo: simple reschedule 1 day later, same time.
    const nextDate = new Date(booking.date);
    nextDate.setDate(nextDate.getDate() + 1);
    const dateStr = nextDate.toISOString().slice(0, 10);
    try {
      await rescheduleBooking(booking.id, dateStr, booking.timeSlot);
      load();
    } catch {
      setError("Failed to reschedule consultation.");
    }
  };

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

  if (error && bookings.length === 0) {
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
                              {b.userName ?? `User ${b.userId}`}
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
                                  : b.status === "accepted" ||
                                    b.status === "rescheduled"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {b.status}
                            </Badge>
                            {tab === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleStatus(b.id, "accepted")
                                  }
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleStatus(b.id, "declined")
                                  }
                                >
                                  Decline
                                </Button>
                              </>
                            )}
                            {tab === "upcoming" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReschedule(b)}
                                >
                                  Reschedule
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleStatus(b.id, "completed")
                                  }
                                >
                                  Mark completed
                                </Button>
                              </>
                            )}
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

