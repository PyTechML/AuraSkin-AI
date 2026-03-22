"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import {
  getDermatologistAvailability,
  updateDermatologistAvailability,
  type DermatologistAvailability,
  type DermatologistAvailabilityDay,
} from "@/services/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CardSkeleton } from "@/components/ui/skeleton-primitives";
import { PanelPageHeader } from "@/components/layouts/PanelPageHeader";
import { PanelSectionReveal } from "@/components/panel/PanelReveal";

function formatRange(slot: { start: string; end: string }) {
  return `${slot.start}–${slot.end}`;
}

export default function DermatologistAvailabilityPage() {
  const { session } = useAuth();
  const dermatologistId = session?.user?.id ?? "";
  const [availability, setAvailability] =
    useState<DermatologistAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const normalizeAvailability = (
    raw: DermatologistAvailability | null | undefined,
    fallbackDermatologistId: string
  ): DermatologistAvailability => {
    const safeRaw = raw ?? ({} as Partial<DermatologistAvailability>);
    const safeDays = Array.isArray(safeRaw.days)
      ? safeRaw.days.map((day) => ({
          day: day?.day ?? "",
          slots: Array.isArray(day?.slots)
            ? day.slots.map((slot) => ({
                start: slot?.start ?? "",
                end: slot?.end ?? "",
              }))
            : [],
        }))
      : [];
    const safeHolidays = Array.isArray(safeRaw.holidays)
      ? safeRaw.holidays.filter((h): h is string => typeof h === "string")
      : [];
    const did = String(safeRaw.dermatologistId ?? fallbackDermatologistId ?? "").trim();
    return {
      dermatologistId: did,
      days: safeDays,
      holidays: safeHolidays,
      autoSave: Boolean(safeRaw.autoSave),
    };
  };
  const loadAvailability = () => {
    if (!dermatologistId) {
      setAvailability(normalizeAvailability(null, ""));
      setLoading(false);
      return () => {};
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDermatologistAvailability(dermatologistId)
      .then((response) => {
        if (cancelled) return;
        setAvailability(normalizeAvailability(response, dermatologistId));
      })
      .catch(() => {
        if (cancelled) return;
        setError("Failed to load availability.");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  };

  useEffect(() => {
    const cleanup = loadAvailability();
    return cleanup;
  }, [dermatologistId]);

  const updateDay = (index: number, day: Partial<DermatologistAvailabilityDay>) => {
    if (!availability) return;
    const nextDays = availability.days.map((d, i) =>
      i === index ? { ...d, ...day } : d
    );
    setAvailability({ ...availability, days: nextDays });
  };

  const addSlot = (index: number) => {
    if (!availability) return;
    const nextDays = [...availability.days];
    const day = nextDays[index];
    const slots = [...day.slots, { start: "09:00", end: "12:00" }];
    nextDays[index] = { ...day, slots };
    setAvailability({ ...availability, days: nextDays });
  };

  const updateSlot = (
    dayIndex: number,
    slotIndex: number,
    field: "start" | "end",
    value: string
  ) => {
    if (!availability) return;
    const nextDays = [...availability.days];
    const day = nextDays[dayIndex];
    const slots = day.slots.map((s, i) =>
      i === slotIndex ? { ...s, [field]: value } : s
    );
    nextDays[dayIndex] = { ...day, slots };
    setAvailability({ ...availability, days: nextDays });
  };

  const removeSlot = (dayIndex: number, slotIndex: number) => {
    if (!availability) return;
    const nextDays = [...availability.days];
    const day = nextDays[dayIndex];
    const slots = day.slots.filter((_, i) => i !== slotIndex);
    nextDays[dayIndex] = { ...day, slots };
    setAvailability({ ...availability, days: nextDays });
  };

  const toggleHoliday = (date: string) => {
    if (!availability) return;
    const holidays = availability.holidays.includes(date)
      ? availability.holidays.filter((d) => d !== date)
      : [...availability.holidays, date];
    setAvailability({ ...availability, holidays });
  };

  const handleSave = async () => {
    if (!availability) return;
    setSaving(true);
    setSaveSuccess(false);
    setError(null);
    try {
      const updated = await updateDermatologistAvailability(
        dermatologistId,
        availability
      );
      setAvailability(normalizeAvailability(updated, dermatologistId));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Failed to update availability.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !availability) {
    return (
      <div className="space-y-6">
        <PanelPageHeader
          title="Availability"
          subtitle="Define your weekly consultation hours and manage appointment slots."
        />
        <CardSkeleton height="h-48" />
      </div>
    );
  }

  if (error && !availability) {
    return (
      <div className="space-y-6">
        <PanelPageHeader
          title="Availability"
          subtitle="Define your weekly consultation hours and manage appointment slots."
        />
        <Card className="border-border max-w-md">
          <CardContent className="py-6">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={loadAvailability}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const avail = availability ?? normalizeAvailability(null, dermatologistId);

  return (
    <div className="space-y-6">
      <PanelPageHeader
        title="Availability"
        subtitle="Define your weekly consultation hours and manage appointment slots."
      />

      <p className="text-sm text-muted-foreground">
        Patients can only book consultations during active availability slots.
      </p>
      <PanelSectionReveal>
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-heading">Weekly schedule</CardTitle>
          <CardDescription>
            Configure which days and times you are available for consultations. Changes are stored and synced to the backend when you save.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {avail.days.length === 0 ? (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
              No slots created
            </div>
          ) : (
            avail.days.map((day, dayIndex) => (
            <div
              key={(day.day ?? "").trim() || `day-${dayIndex}`}
              className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Input
                    value={day.day}
                    onChange={(e) =>
                      updateDay(dayIndex, { day: e.target.value })
                    }
                    className="w-32"
                  />
                  <span className="text-xs text-muted-foreground">
                    {(Array.isArray(day.slots) ? day.slots : []).length} slot(s)
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addSlot(dayIndex)}
                >
                  Add slot
                </Button>
              </div>
              <div className="space-y-2">
                {(Array.isArray(day.slots) ? day.slots : []).map((slot, slotIndex) => (
                  <div
                    key={`${slot.start}-${slot.end}-${slotIndex}`}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <Input
                      type="time"
                      value={slot.start}
                      onChange={(e) =>
                        updateSlot(dayIndex, slotIndex, "start", e.target.value)
                      }
                      className="w-28"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={slot.end}
                      onChange={(e) =>
                        updateSlot(dayIndex, slotIndex, "end", e.target.value)
                      }
                      className="w-28"
                    />
                    <span className="text-xs text-muted-foreground">
                      {formatRange(slot)}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeSlot(dayIndex, slotIndex)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )))}
        </CardContent>
      </Card>
      </PanelSectionReveal>

      <PanelSectionReveal>
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-heading">Holidays & auto-save</CardTitle>
          <CardDescription>
            Manage exceptions and how your schedule changes are saved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Holidays</Label>
            <div className="flex flex-wrap gap-2">
              {(Array.isArray(avail.holidays) ? avail.holidays : []).map((h) => (
                <Button
                  key={h}
                  size="sm"
                  variant="outline"
                  onClick={() => toggleHoliday(h)}
                >
                  {h}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                className="w-48"
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) toggleHoliday(v);
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={Boolean(avail.autoSave)}
              onCheckedChange={(v) =>
                setAvailability({ ...avail, autoSave: v })
              }
              id="autoSave"
            />
            <Label htmlFor="autoSave">Auto-save changes</Label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            {saveSuccess && (
              <span className="text-sm text-green-600 dark:text-green-400">
                Availability updated successfully.
              </span>
            )}
            {error && (
              <span className="text-sm text-red-600 dark:text-red-400">
                {error}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
      </PanelSectionReveal>
    </div>
  );
}

