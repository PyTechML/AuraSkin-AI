"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { getAssignedUserDetail, getDermatologistConsultations } from "@/services/apiPartner";
import type { AssignedUserDetail } from "@/types";
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
  ArrowLeft,
  ShoppingBag,
  Calendar,
  FileText,
} from "lucide-react";

export default function DermatologistPatientDetailPage() {
  const params = useParams();
  const patientId = params.id as string;
  const { session } = useAuth();
  const partnerId = session?.user?.id ?? "";
  const [patient, setPatient] = useState<AssignedUserDetail | null>(null);
  const [consultationHistory, setConsultationHistory] = useState<
    NormalizedConsultation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!partnerId || !patientId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getAssignedUserDetail(partnerId, patientId)
      .then(setPatient)
      .catch(() => setError("Failed to load patient."))
      .finally(() => setLoading(false));
  }, [partnerId, patientId]);

  useEffect(() => {
    if (!partnerId || !patientId) {
      setConsultationHistory([]);
      return;
    }
    let cancelled = false;
    getDermatologistConsultations()
      .then((all) => {
        if (cancelled) return;
        const pid = patientId.trim();
        const mine = (Array.isArray(all) ? all : []).filter(
          (c) => (c.patientId ?? "").trim() === pid
        );
        mine.sort((a, b) => {
          const ta = new Date(`${a.date ?? ""}T${a.timeSlot ?? ""}`).getTime();
          const tb = new Date(`${b.date ?? ""}T${b.timeSlot ?? ""}`).getTime();
          return (Number(tb) || 0) - (Number(ta) || 0);
        });
        setConsultationHistory(mine);
      })
      .catch(() => {
        if (!cancelled) setConsultationHistory([]);
      });
    return () => {
      cancelled = true;
    };
  }, [partnerId, patientId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 rounded bg-muted/60 animate-pulse" />
        <div className="h-48 rounded-xl border border-border/60 bg-muted/40 animate-pulse" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="space-y-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dermatologist/patients">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to patients
          </Link>
        </Button>
        <Card className="border-border max-w-md">
          <CardContent className="py-6">
            <p className="text-muted-foreground">
              {error ?? "Patient not found."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Button variant="outline" size="sm" asChild>
        <Link href="/dermatologist/patients">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to patients
        </Link>
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">{patient.name}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {patient.lifetimeValue != null && (
            <span className="text-sm font-label text-muted-foreground">
              Lifetime value: ${patient.lifetimeValue.toFixed(2)}
            </span>
          )}
          <Badge variant="secondary">{patient.status}</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Assessment history
            </CardTitle>
          </CardHeader>
          <CardContent>
            {patient.activityTimeline && patient.activityTimeline.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {patient.activityTimeline.map((a) => (
                  <li
                    key={a.id}
                    className="flex justify-between"
                  >
                    <span className="text-muted-foreground">{a.title}</span>
                    <span className="text-muted-foreground">{a.date}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No assessment history yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" /> Purchase history
            </CardTitle>
          </CardHeader>
          <CardContent>
            {patient.purchaseHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No purchases yet.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {patient.purchaseHistory.map((p) => (
                  <li
                    key={p.orderId}
                    className="flex justify-between"
                  >
                    <span>
                      {p.orderId} · {p.date}
                    </span>
                    <span>${p.total.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Consultation history
          </CardTitle>
        </CardHeader>
        <CardContent>
          {consultationHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No consultations with this patient yet.
            </p>
          ) : (
            <ul className="space-y-3 text-sm">
              {consultationHistory.map((c) => {
                const notePreview = (c.notes ?? "")
                  .trim()
                  .replace(/\s+/g, " ")
                  .slice(0, 100);
                return (
                  <li
                    key={c.id}
                    className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 border-b border-border/60 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="font-medium">
                        {(c.date ?? "").trim() || "-"}{" "}
                        <span className="text-muted-foreground font-normal">
                          · {(c.timeSlot ?? "").trim() || "-"} · {c.status ?? ""}
                        </span>
                      </p>
                      <p className="text-muted-foreground break-words">
                        {notePreview
                          ? `${notePreview}${(c.notes ?? "").trim().length > 100 ? "…" : ""}`
                          : "No notes saved yet."}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="shrink-0" asChild>
                      <Link href={`/dermatologist/consultations/${c.id}`}>
                        Open
                      </Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <FileText className="h-4 w-4" /> Clinical notes & routine
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">Treatment notes</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {patient.notes || "No notes recorded yet."}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium mb-1">Prescribed routine</p>
            <p className="text-sm text-muted-foreground">
              Routine recommendations can be documented here in future
              iterations. For now this section is a placeholder.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium mb-1">Uploaded reports</p>
            <p className="text-sm text-muted-foreground">
              File upload and report viewing can be wired to the backend; this
              demo keeps the structure ready.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

