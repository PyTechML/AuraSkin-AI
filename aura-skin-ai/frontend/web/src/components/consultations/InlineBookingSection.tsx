"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase, isSupabaseBrowserConfigured } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  getDermatologistSlotsPublic,
  createConsultationPayment,
  type PublicSlot,
} from "@/services/api";

const PRIMARY_BTN_FULL =
  "inline-flex items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background w-full";

const PRIMARY_BTN_MODAL =
  "inline-flex items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

type AvailableDate = {
  dateKey: string;
  dateLabel: string;
  slots: { id: string; timeLabel: string }[];
};

function formatDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function formatTimeLabel(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr ?? "00";
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m} ${suffix}`;
}

function groupSlotsByDate(slots: PublicSlot[]): AvailableDate[] {
  const map = new Map<string, AvailableDate>();
  for (const slot of slots) {
    const key = slot.slot_date;
    const group = map.get(key) ?? {
      dateKey: key,
      dateLabel: formatDateLabel(key),
      slots: [],
    };
    group.slots.push({
      id: slot.id,
      timeLabel: formatTimeLabel(slot.start_time),
    });
    map.set(key, group);
  }
  return Array.from(map.values());
}

type SelectedSlot = {
  id: string;
  dateKey: string;
  dateLabel: string;
  timeLabel: string;
};

export function RecommendedApproachWithInlineBooking(props: {
  dermatologistId: string;
  dermatologistName: string;
}) {
  const user = useAuthStore((s) => s.user);

  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<SelectedSlot | null>(null);
  const [sentModalOpen, setSentModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawSlots, setRawSlots] = useState<PublicSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const availability = useMemo(() => groupSlotsByDate(rawSlots), [rawSlots]);

  useEffect(() => {
    if (!isOpen || !props.dermatologistId) return;
    let cancelled = false;

    const loadSlots = () => {
      setSlotsLoading(true);
      getDermatologistSlotsPublic(props.dermatologistId)
        .then((slots) => {
          if (!cancelled) setRawSlots(slots);
        })
        .finally(() => {
          if (!cancelled) setSlotsLoading(false);
        });
    };

    loadSlots();

    if (!isSupabaseBrowserConfigured) {
      return () => {
        cancelled = true;
      };
    }

    const channel = supabase
      .channel(`availability_slots:${props.dermatologistId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "availability_slots",
          filter: `doctor_id=eq.${props.dermatologistId}`,
        },
        () => {
          if (!cancelled) loadSlots();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [isOpen, props.dermatologistId]);

  const onConfirm = async () => {
    if (!selected || !user) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createConsultationPayment(
        props.dermatologistId,
        selected.id
      );
      if (result.checkout_url) {
        window.location.href = result.checkout_url;
        return;
      }
      if (result.instant === true) {
        setSentModalOpen(true);
        return;
      }
      setError("Could not start payment. Please try again.");
    } catch (e: any) {
      setError(e?.message ?? "Booking failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Recommended approach + Book CTA */}
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

              {slotsLoading && (
                <p className="text-sm text-muted-foreground animate-pulse py-4">Loading available slots…</p>
              )}

              {!slotsLoading && availability.length === 0 && (
                <p className="text-sm text-muted-foreground py-4">
                  No available slots at the moment. Please check back later.
                </p>
              )}

              <div className="grid gap-3">
                {availability.map((d) => (
                  <div key={d.dateKey} className="rounded-xl border border-border/60 bg-background/60 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <p className="font-heading text-sm font-semibold text-foreground">{d.dateLabel}</p>
                      <span className="text-xs text-muted-foreground">Upcoming</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {d.slots.map((s) => {
                        const isSelected = selected?.id === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() =>
                              setSelected({
                                id: s.id,
                                dateKey: d.dateKey,
                                dateLabel: d.dateLabel,
                                timeLabel: s.timeLabel,
                              })
                            }
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
                        <p className="text-sm font-medium text-foreground">
                          {selected.dateLabel} – {selected.timeLabel}
                        </p>
                      </div>
                      {error && <p className="text-xs text-destructive">{error}</p>}
                      <div className="pt-1">
                        <button
                          type="button"
                          className={PRIMARY_BTN_FULL}
                          onClick={onConfirm}
                          disabled={submitting}
                        >
                          {submitting ? "Processing…" : "Confirm Booking"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
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
