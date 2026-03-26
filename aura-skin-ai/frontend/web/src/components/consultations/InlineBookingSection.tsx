"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  createRequest,
  getAutoOpenDermatologistId,
  listRequests,
  setAutoOpenDermatologistId,
  type ConsultationRequest,
  type ConsultationSlot,
} from "@/lib/consultationSim";

const PRIMARY_BTN_FULL =
  "inline-flex items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background w-full";

const PRIMARY_BTN_MODAL =
  "inline-flex items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

type AvailableDate = {
  dateKey: string;
  dateLabel: string;
  slots: { timeLabel: string }[];
};

function defaultAvailability(): AvailableDate[] {
  return [
    {
      dateKey: "2026-06-12",
      dateLabel: "June 12",
      slots: [{ timeLabel: "10:00 AM" }, { timeLabel: "11:30 AM" }, { timeLabel: "2:00 PM" }, { timeLabel: "4:15 PM" }],
    },
    {
      dateKey: "2026-06-13",
      dateLabel: "June 13",
      slots: [{ timeLabel: "9:15 AM" }, { timeLabel: "1:00 PM" }, { timeLabel: "3:30 PM" }],
    },
  ];
}

function formatSlot(slot: ConsultationSlot) {
  return `${slot.dateLabel} – ${slot.timeLabel}`;
}

export function RecommendedApproachWithInlineBooking(props: {
  dermatologistId: string;
  dermatologistName: string;
}) {
  const simEnabled =
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_ENABLE_CONSULTATION_SIM === "true";
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const userName = user?.name ?? "";

  const availability = useMemo(() => defaultAvailability(), []);

  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<ConsultationSlot | null>(null);
  const [sentModalOpen, setSentModalOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState<ConsultationRequest | null>(null);

  useEffect(() => {
    const autoOpenFor = getAutoOpenDermatologistId();
    if (autoOpenFor && autoOpenFor === props.dermatologistId) {
      setIsOpen(true);
      setAutoOpenDermatologistId(null);
    }
  }, [props.dermatologistId]);

  useEffect(() => {
    if (!userId) {
      setActiveRequest(null);
      return;
    }
    const latest = listRequests({ userId, dermatologistId: props.dermatologistId })[0] ?? null;
    setActiveRequest(latest);
  }, [userId, props.dermatologistId]);

  const statusPanel =
    activeRequest?.status === "PENDING" ? (
      <motion.div
        key="pending-panel"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="mt-4 rounded-xl border border-border/60 bg-muted/10 p-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-label font-semibold text-foreground">Status: Pending Approval</p>
            <p className="text-sm text-muted-foreground">Waiting for dermatologist response.</p>
          </div>
          <Badge variant="warning" className="shrink-0">
            Pending
          </Badge>
        </div>
      </motion.div>
    ) : null;

  const onConfirm = () => {
    if (!selected || !userId || !userName) return;
    const created = createRequest({
      user: { id: userId, name: userName },
      dermatologist: { id: props.dermatologistId, name: props.dermatologistName },
      slot: selected,
    });
    setActiveRequest(created);
    setSentModalOpen(true);
  };

  return (
    <div>
      {/* Recommended approach (Usage → Recommended Approach) + Book CTA */}
      <div className="rounded-xl border border-border/50 bg-background/60 p-5 h-fit space-y-4">
        <h3 className="font-heading text-base font-semibold text-foreground">Recommended approach</h3>
        <p className="text-sm font-body text-muted-foreground leading-relaxed">
          A typical consultation may include a review of your routine, targeted adjustments to products, and a clear
          follow-up plan so you know what to expect over the next few weeks.
        </p>
        <p className="text-sm font-body text-muted-foreground leading-relaxed">
          Booking a consultation helps align your AI-driven routine with clinical expertise for the best possible
          outcomes.
        </p>
        <div className="pt-2">
          <button
            type="button"
            className={PRIMARY_BTN_FULL}
            onClick={() => setIsOpen((v) => !v)}
            aria-expanded={isOpen}
            aria-controls="inline-booking"
          >
            Book Consultation
          </button>
        </div>
      </div>

      {/* Inline booking section BELOW the card */}
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.section
            id="inline-booking"
            key="inline-booking"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-2xl border border-border/60 bg-muted/10 p-5 lg:p-6">
              <div className="mb-4">
                <h4 className="font-heading text-base font-semibold text-foreground">Available Consultation Slots</h4>
                <p className="text-sm text-muted-foreground">Choose a suitable time to request a consultation.</p>
              </div>

              <div className="grid gap-3">
                {availability.map((d) => (
                  <div key={d.dateKey} className="rounded-xl border border-border/60 bg-background/60 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <p className="font-heading text-sm font-semibold text-foreground">{d.dateLabel}</p>
                      <span className="text-xs text-muted-foreground">Upcoming</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {d.slots.map((s) => {
                        const slot: ConsultationSlot = {
                          dateKey: d.dateKey,
                          dateLabel: d.dateLabel,
                          timeLabel: s.timeLabel,
                        };
                        const isSelected =
                          selected?.dateKey === slot.dateKey && selected?.timeLabel === slot.timeLabel;
                        return (
                          <button
                            key={`${d.dateKey}-${s.timeLabel}`}
                            type="button"
                            onClick={() => setSelected(slot)}
                            className={cn(
                              "inline-flex items-center rounded-full border px-3 py-1.5 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                              isSelected
                                ? "border-accent bg-accent/10 text-accent shadow-[0_0_12px_hsl(var(--accent)/0.2)]"
                                : "border-border/60 bg-muted/40 text-foreground hover:bg-muted/60"
                            )}
                            aria-pressed={isSelected}
                          >
                            {s.timeLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <AnimatePresence initial={false}>
                {selected ? (
                  <motion.div
                    key="summary"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="mt-4 rounded-xl border border-border/60 bg-background/60 p-4"
                  >
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-label text-muted-foreground/80">Consultation with:</p>
                        <p className="text-sm font-medium text-foreground">{props.dermatologistName}</p>
                      </div>
                      <div>
                        <p className="text-xs font-label text-muted-foreground/80">Selected Time:</p>
                        <p className="text-sm font-medium text-foreground">{formatSlot(selected)}</p>
                      </div>
                      <div className="pt-1">
                        <button
                          type="button"
                          className={PRIMARY_BTN_FULL}
                          onClick={onConfirm}
                          disabled={activeRequest?.status === "PENDING"}
                        >
                          Confirm Booking
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {statusPanel}
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <Dialog open={sentModalOpen} onOpenChange={setSentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Consultation Request Sent</DialogTitle>
            <DialogDescription>
              Your consultation request has been shared with the dermatologist. You will be notified once they review
              and confirm your request.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" className={PRIMARY_BTN_MODAL} onClick={() => setSentModalOpen(false)}>
              OK
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

