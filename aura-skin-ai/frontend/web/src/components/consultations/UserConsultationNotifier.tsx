"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuthStore } from "@/store/authStore";
import {
  listRequests,
  markUserNotified,
  setAutoOpenDermatologistId,
  subscribe,
  updateRequestStatus,
  type ConsultationRequest,
} from "@/lib/consultationSim";

const PRIMARY_BTN_MODAL =
  "inline-flex items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

type ModalKind = "CONFIRMED" | "DECLINED" | "RESCHEDULE_PROPOSED";

function pickNextToNotify(requests: ConsultationRequest[]): { kind: ModalKind; request: ConsultationRequest } | null {
  const candidates = requests
    .filter((r) => r.status !== "PENDING")
    .filter((r) => r.userLastNotifiedStatus !== r.status)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const next = candidates[0];
  if (!next) return null;

  if (next.status === "CONFIRMED") return { kind: "CONFIRMED", request: next };
  if (next.status === "DECLINED") return { kind: "DECLINED", request: next };
  return { kind: "RESCHEDULE_PROPOSED", request: next };
}

export function UserConsultationNotifier() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;

  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<{ kind: ModalKind; request: ConsultationRequest } | null>(null);
  const [followupConfirmed, setFollowupConfirmed] = useState<ConsultationRequest | null>(null);

  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  const next = useMemo(() => {
    if (!userId) return null;
    const requests = listRequests({ userId });
    return pickNextToNotify(requests);
  }, [userId, tick]);

  useEffect(() => {
    if (open) return;
    if (next) {
      setCurrent(next);
      setOpen(true);
    }
  }, [next, open]);

  const closeAndMark = () => {
    if (current) markUserNotified(current.request.id, current.request.status);
    setOpen(false);
    setCurrent(null);
  };

  const scrollToBooking = () => {
    const el = document.getElementById("consultation-status-card");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onViewBooking = () => {
    closeAndMark();
    setTimeout(() => {
      scrollToBooking();
    }, 50);
  };

  const onDeclinedOk = () => {
    if (current) setAutoOpenDermatologistId(current.request.dermatologist.id);
    closeAndMark();
  };

  const onAcceptProposed = () => {
    if (!current?.request.proposedSlot) return;
    const updated = updateRequestStatus(current.request.id, "CONFIRMED", {
      requestedSlot: current.request.proposedSlot,
    });
    // Mark the proposal as seen, then immediately show the confirmed modal (SaaS-like feedback).
    markUserNotified(current.request.id, "RESCHEDULE_PROPOSED");
    setOpen(false);
    setCurrent(null);
    if (updated) setFollowupConfirmed(updated);
  };

  const onChooseDifferent = () => {
    if (current) {
      setAutoOpenDermatologistId(current.request.dermatologist.id);
      updateRequestStatus(current.request.id, "DECLINED");
      markUserNotified(current.request.id, "DECLINED");
    }
    setOpen(false);
    setCurrent(null);
  };

  const render = () => {
    if (!current) return null;

    if (current.kind === "CONFIRMED") {
      return (
        <>
          <DialogHeader>
            <DialogTitle>Consultation Confirmed</DialogTitle>
            <DialogDescription>
              {current.request.dermatologist.name} has accepted your request. Your session is scheduled for:
              <br />
              <span className="font-medium text-foreground">
                {current.request.requestedSlot.dateLabel} – {current.request.requestedSlot.timeLabel}
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" className={PRIMARY_BTN_MODAL} onClick={onViewBooking}>
              View Booking
            </button>
          </DialogFooter>
        </>
      );
    }

    if (current.kind === "DECLINED") {
      return (
        <>
          <DialogHeader>
            <DialogTitle>Consultation Request Declined</DialogTitle>
            <DialogDescription>You may choose another available slot.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" className={PRIMARY_BTN_MODAL} onClick={onDeclinedOk}>
              OK
            </button>
          </DialogFooter>
        </>
      );
    }

    return (
      <>
        <DialogHeader>
          <DialogTitle>New Time Proposed</DialogTitle>
          <DialogDescription>
            {current.request.dermatologist.name} has suggested a new time.
            <br />
            <span className="font-medium text-foreground">
              {current.request.proposedSlot?.dateLabel} – {current.request.proposedSlot?.timeLabel}
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-2">
          <button type="button" className={PRIMARY_BTN_MODAL} onClick={onAcceptProposed}>
            Accept
          </button>
          <button type="button" className={PRIMARY_BTN_MODAL} onClick={onChooseDifferent}>
            Choose Different Slot
          </button>
        </DialogFooter>
      </>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeAndMark())}>
        <DialogContent>{render()}</DialogContent>
      </Dialog>

      <Dialog
        open={!!followupConfirmed}
        onOpenChange={(v) => {
          if (!v && followupConfirmed) {
            markUserNotified(followupConfirmed.id, "CONFIRMED");
            setFollowupConfirmed(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Consultation Confirmed</DialogTitle>
            <DialogDescription>
              {followupConfirmed?.dermatologist.name} has accepted your request. Your session is scheduled for:
              <br />
              <span className="font-medium text-foreground">
                {followupConfirmed?.requestedSlot.dateLabel} – {followupConfirmed?.requestedSlot.timeLabel}
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              className={PRIMARY_BTN_MODAL}
              onClick={() => {
                if (followupConfirmed) markUserNotified(followupConfirmed.id, "CONFIRMED");
                setFollowupConfirmed(null);
                setTimeout(() => scrollToBooking(), 50);
              }}
            >
              View Booking
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

