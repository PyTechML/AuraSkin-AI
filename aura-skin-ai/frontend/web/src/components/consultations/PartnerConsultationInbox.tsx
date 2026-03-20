"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listRequests, subscribe, updateRequestStatus, type ConsultationRequest, type ConsultationSlot } from "@/lib/consultationSim";

function pickPending(requests: ConsultationRequest[]) {
  return requests.filter((r) => r.status === "PENDING").sort((a, b) => b.updatedAt - a.updatedAt);
}

function proposeSlot(request: ConsultationRequest): ConsultationSlot {
  // Match the spec example where possible.
  const preferred: ConsultationSlot = {
    dateKey: "2026-06-12",
    dateLabel: "June 12",
    timeLabel: "4:15 PM",
  };
  if (
    request.requestedSlot.dateKey === preferred.dateKey &&
    request.requestedSlot.timeLabel === preferred.timeLabel
  ) {
    return { ...preferred, timeLabel: "11:30 AM" };
  }
  if (request.requestedSlot.dateKey === preferred.dateKey) return preferred;
  return { ...request.requestedSlot, timeLabel: "4:15 PM" };
}

export function PartnerConsultationInbox() {
  const [tick, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  const pending = useMemo(() => {
    const all = listRequests();
    return pickPending(all);
  }, [tick]);

  if (pending.length === 0) return null;

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key="partner-inbox"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <Card className="border-border">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="font-heading">New Consultation Request</CardTitle>
              <CardDescription>Review and respond to the latest request.</CardDescription>
            </div>
            <Badge variant="warning">Pending</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {pending.slice(0, 3).map((r) => (
              <div key={r.id} className="rounded-xl border border-border/60 bg-muted/10 p-4 space-y-3">
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="text-muted-foreground">User:</span>{" "}
                    <span className="font-medium text-foreground">{r.user.name}</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Requested Time:</span>{" "}
                    <span className="font-medium text-foreground">
                      {r.requestedSlot.dateLabel} – {r.requestedSlot.timeLabel}
                    </span>
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="gap-2"
                    onClick={() => updateRequestStatus(r.id, "CONFIRMED")}
                  >
                    Accept
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() =>
                      updateRequestStatus(r.id, "RESCHEDULE_PROPOSED", { proposedSlot: proposeSlot(r) })
                    }
                  >
                    Reschedule
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="gap-2"
                    onClick={() => updateRequestStatus(r.id, "DECLINED")}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))}
            {pending.length > 3 ? (
              <p className="text-sm text-muted-foreground">Showing 3 of {pending.length} pending requests.</p>
            ) : null}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

