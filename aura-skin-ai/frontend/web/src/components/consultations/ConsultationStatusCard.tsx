"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listRequests, subscribe, type ConsultationRequest } from "@/lib/consultationSim";
import { useAuthStore } from "@/store/authStore";

function pickConfirmed(requests: ConsultationRequest[]): ConsultationRequest | null {
  return requests.find((r) => r.status === "CONFIRMED") ?? null;
}

export function ConsultationStatusCard() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const [tick, setTick] = useState(0);

  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  const confirmed = useMemo(() => {
    if (!userId) return null;
    const requests = listRequests({ userId });
    return pickConfirmed(requests);
  }, [userId, tick]);

  if (!confirmed) return null;

  return (
    <motion.div
      id="consultation-status-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Card className="border-border">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="font-heading">Upcoming Consultation</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Your next scheduled session.</p>
          </div>
          <Badge variant="success" className="mt-1">
            Confirmed
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">With:</span>
            <span className="text-sm font-medium text-foreground">{confirmed.dermatologist.name}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Date:</span>
            <span className="text-sm font-medium text-foreground">
              {confirmed.requestedSlot.dateLabel} – {confirmed.requestedSlot.timeLabel}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Status:</span>
            <span className="text-sm font-medium text-foreground">Confirmed</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

