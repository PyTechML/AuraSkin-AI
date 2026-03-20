"use client";

import { useEffect, useState } from "react";
import {
  getBookingsForPartner,
  updateBookingStatus,
  rescheduleBooking,
} from "@/services/apiPartner";
import { useAuth } from "@/providers/AuthProvider";
import type { ConsultationBooking } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User } from "lucide-react";
import { CardSkeleton } from "@/components/ui/skeleton-primitives";

export default function PartnerBookingsPage() {
  const { session } = useAuth();
  const partnerId = session?.user?.id ?? "";
  const [bookings, setBookings] = useState<ConsultationBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!partnerId) return;
    getBookingsForPartner(partnerId)
      .then(setBookings)
      .catch(() => setError("Failed to load bookings."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    load();
  }, [partnerId]);

  const upcoming = bookings.filter(
    (b) =>
      b.status !== "completed" &&
      b.status !== "cancelled" &&
      b.status !== "declined" &&
      (new Date(b.date) >= new Date() || b.status === "pending" || b.status === "accepted")
  );
  const past = bookings.filter(
    (b) =>
      b.status === "completed" ||
      b.status === "cancelled" ||
      b.status === "declined" ||
      new Date(b.date) < new Date()
  );

  const handleStatus = async (id: string, status: ConsultationBooking["status"]) => {
    try {
      await updateBookingStatus(id, status);
      load();
    } catch {
      setError("Failed to update booking.");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 rounded bg-muted/40 animate-pulse" aria-hidden />
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
        <h1 className="font-heading text-2xl font-semibold">Consultations</h1>
        <Card className="border-border max-w-md">
          <CardContent className="py-6">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={() => { setLoading(true); load(); }}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="font-heading text-2xl font-semibold">Consultations</h1>
      <p className="text-muted-foreground">
        Manage consultation requests. Accept, decline, or reschedule.
      </p>

      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-lg font-medium mb-4">Upcoming</h2>
          {upcoming.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-8 text-center text-muted-foreground">
                No upcoming bookings.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {upcoming.map((b) => (
                <Card key={b.id} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {b.userName ?? `User ${b.userId}`}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3" /> {b.date} · <Clock className="h-3 w-3" /> {b.timeSlot}
                        </p>
                        {b.notes && (
                          <p className="text-sm text-muted-foreground mt-2">Notes: {b.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={
                            b.status === "pending"
                              ? "warning"
                              : b.status === "accepted"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {b.status}
                        </Badge>
                        {b.status === "pending" && (
                          <>
                            <Button size="sm" onClick={() => handleStatus(b.id, "accepted")}>
                              Accept
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleStatus(b.id, "declined")}>
                              Decline
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="outline" disabled>
                          Reschedule
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="font-heading text-lg font-medium mb-4">Past</h2>
          {past.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-8 text-center text-muted-foreground">
                No past bookings.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {past.map((b) => (
                <Card key={b.id} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <p className="font-medium">{b.userName ?? `User ${b.userId}`}</p>
                        <p className="text-sm text-muted-foreground">
                          {b.date} · {b.timeSlot} · {b.status}
                        </p>
                      </div>
                      <Badge variant="secondary">{b.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
