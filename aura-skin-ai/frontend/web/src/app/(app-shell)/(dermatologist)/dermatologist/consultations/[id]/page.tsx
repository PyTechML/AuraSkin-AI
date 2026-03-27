"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import {
  approveDermatologistConsultation,
  getDermatologistConsultationById,
  getDermatologistPatientDisplayName,
  rejectDermatologistConsultation,
  updateDermatologistConsultation,
} from "@/services/apiPartner";
import type { NormalizedConsultation } from "@/types/consultation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { usePanelToast } from "@/components/panel/PanelToast";
import { ArrowLeft, User, Calendar, Clock } from "lucide-react";

export default function DermatologistConsultationDetailPage() {
  const params = useParams();
  const consultationId = params.id as string;
  const { session } = useAuth();
  const partnerId = session?.user?.id ?? "";
  const { addToast } = usePanelToast();
  const [consultation, setConsultation] = useState<NormalizedConsultation | null>(
    null
  );
  const [patientLabel, setPatientLabel] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [treatmentPlan, setTreatmentPlan] = useState("");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionBusy, setActionBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!partnerId || !consultationId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDermatologistConsultationById(consultationId)
      .then((c) => {
        if (cancelled) return;
        setConsultation(c);
        if (!c) return;
        setDiagnosis(c.diagnosis ?? "");
        setNotes(c.notes ?? "");
        setTreatmentPlan(c.treatmentPlan ?? "");
        setFollowUpRequired(Boolean(c.followUpRequired));
        const pid = (c.patientId ?? "").trim();
        return getDermatologistPatientDisplayName(pid).then((name) => {
          if (cancelled) return;
          const label =
            (name ?? "").trim() ||
            (pid ? `Patient ${pid}` : "Unknown patient");
          setPatientLabel(label);
        });
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load consultation.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [partnerId, consultationId]);

  async function handleSave() {
    if (!consultationId) return;
    setSaving(true);
    try {
      const updated = await updateDermatologistConsultation(consultationId, {
        notes: notes ?? "",
        diagnosis: diagnosis ?? "",
        treatmentPlan: treatmentPlan ?? "",
        followUpRequired,
      });
      if (updated) {
        setConsultation(updated);
        setDiagnosis(updated.diagnosis ?? "");
        setNotes(updated.notes ?? "");
        setTreatmentPlan(updated.treatmentPlan ?? "");
        setFollowUpRequired(Boolean(updated.followUpRequired));
        addToast("Consultation notes saved", "success");
      } else {
        addToast("Could not save consultation notes.", "error");
      }
    } catch {
      addToast("Could not save consultation notes.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    if (!consultationId || consultation?.status !== "pending") return;
    setActionBusy("approve");
    try {
      const updated = await approveDermatologistConsultation(consultationId);
      if (updated) {
        setConsultation(updated);
        addToast("Consultation confirmed. The patient is notified in their account.", "success");
      } else {
        addToast("Could not confirm this consultation.", "error");
      }
    } catch {
      addToast("Could not confirm this consultation.", "error");
    } finally {
      setActionBusy(null);
    }
  }

  async function handleReject() {
    if (!consultationId || consultation?.status !== "pending") return;
    if (
      !window.confirm(
        "Decline this request? The time slot will be released for other bookings."
      )
    ) {
      return;
    }
    setActionBusy("reject");
    try {
      const updated = await rejectDermatologistConsultation(consultationId);
      if (updated) {
        setConsultation(updated);
        addToast("Consultation declined.", "success");
      } else {
        addToast("Could not decline this consultation.", "error");
      }
    } catch {
      addToast("Could not decline this consultation.", "error");
    } finally {
      setActionBusy(null);
    }
  }

  if (loading && !consultation) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 rounded bg-muted/60 animate-pulse" />
        <div className="h-48 rounded-xl border border-border/60 bg-muted/40 animate-pulse" />
      </div>
    );
  }

  if (error || !consultation) {
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

  const statusLabel = consultation.status ?? "";

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
          Consultation with {patientLabel}
        </h1>
        {consultation.status === "pending" ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={actionBusy !== null}
              onClick={() => void handleApprove()}
            >
              {actionBusy === "approve" ? "Confirming…" : "Approve request"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={actionBusy !== null}
              onClick={() => void handleReject()}
            >
              {actionBusy === "reject" ? "Declining…" : "Decline"}
            </Button>
          </div>
        ) : null}
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
              <span className="font-medium">{patientLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {(consultation.date ?? "").trim() || "-"} ·{" "}
                {(consultation.timeSlot ?? "").trim() || "-"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Status: {statusLabel}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              Clinical notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="consultation-diagnosis">Diagnosis</Label>
              <Textarea
                id="consultation-diagnosis"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Clinical diagnosis"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="consultation-notes">Notes</Label>
              <Textarea
                id="consultation-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Consultation notes"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="consultation-treatment">Treatment plan</Label>
              <Textarea
                id="consultation-treatment"
                value={treatmentPlan}
                onChange={(e) => setTreatmentPlan(e.target.value)}
                placeholder="Treatment plan and recommendations"
                rows={4}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="consultation-followup"
                checked={followUpRequired}
                onCheckedChange={(v) => setFollowUpRequired(v === true)}
              />
              <Label
                htmlFor="consultation-followup"
                className="text-sm font-normal cursor-pointer"
              >
                Follow-up required
              </Label>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
              >
                {saving ? "Saving…" : "Save notes"}
              </Button>
              <Button size="sm" variant="outline" disabled type="button">
                Upload prescription
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
