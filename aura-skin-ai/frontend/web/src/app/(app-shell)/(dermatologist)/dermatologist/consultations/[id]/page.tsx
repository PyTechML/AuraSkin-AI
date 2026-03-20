"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { getBookingsForPartner } from "@/services/apiPartner";
import type { ConsultationBooking } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, User, Calendar, Clock } from "lucide-react";

export default function DermatologistConsultationDetailPage() {
  const params = useParams();
  const consultationId = params.id as string;
  const { session } = useAuth();
  const partnerId = session?.user?.id ?? "";
  const [booking, setBooking] = useState<ConsultationBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!partnerId || !consultationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getBookingsForPartner(partnerId)
      .then((list) => {
        const found = list.find((b) => b.id === consultationId) ?? null;
        setBooking(found);
      })
      .catch(() => setError("Failed to load consultation."))
      .finally(() => setLoading(false));
  }, [partnerId, consultationId]);

  if (loading && !booking) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 rounded bg-muted/60 animate-pulse" />
        <div className="h-48 rounded-xl border border-border/60 bg-muted/40 animate-pulse" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="space-y-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dermatologist/consultations">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to consultations
          </Link>
        </Button>
        <Card className="border-border max-w-md">
          <CardContent className="py-6">
            <p className="text-muted-foreground">
              {error ?? "Consultation not found."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Button variant="outline" size="sm" asChild>
        <Link href="/dermatologist/consultations">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to consultations
        </Link>
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">
          Consultation with {booking.userName ?? booking.userId}
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              Consultation details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {booking.userName ?? booking.userId}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {booking.date} · {booking.timeSlot}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Status: {booking.status}</span>
            </div>
            <p className="text-muted-foreground mt-2">
              This is a demo view. Connect it to clinical records to show full
              assessment context and images.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              Clinical notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add clinical notes for this consultation (demo only; not persisted)."
              rows={6}
            />
            <div className="flex gap-2">
              <Button size="sm" disabled>
                Save notes
              </Button>
              <Button size="sm" variant="outline" disabled>
                Upload prescription
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              In a production system, notes and prescriptions would be saved to
              a secure clinical backend.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

