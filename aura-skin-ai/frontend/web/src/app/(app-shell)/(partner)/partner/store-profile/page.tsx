"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  getPartnerStore,
  updatePartnerStore,
} from "@/services/apiPartner";
import { useAuth } from "@/providers/AuthProvider";
import { usePanelToast } from "@/components/panel/PanelToast";
import type { PartnerStore } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const StoreProfileMap = dynamic(
  () => import("@/components/partner/StoreProfileMap").then((m) => m.StoreProfileMap),
  { ssr: false }
);

function profileCompleteness(form: {
  name: string;
  address: string;
  contact: string;
  openingHours: string;
  description: string;
}): number {
  const filled = [form.name, form.address, form.contact, form.openingHours, form.description].filter(
    (v) => v != null && String(v).trim().length > 0
  ).length;
  return Math.round((filled / 5) * 100);
}

export default function PartnerStoreProfilePage() {
  const { session } = useAuth();
  const partnerId = session?.user?.id ?? "";
  const { addToast } = usePanelToast();
  const [store, setStore] = useState<PartnerStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({
    name: "",
    address: "",
    openingHours: "",
    contact: "",
    description: "",
    taxId: "",
    businessRegistrationNumber: "",
    linkedDermatologist: false,
  });

  useEffect(() => {
    if (!partnerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getPartnerStore(partnerId)
      .then((s) => {
        setStore(s ?? null);
        if (s) {
          setForm({
            name: s.name ?? "",
            address: s.address ?? "",
            openingHours: s.openingHours ?? "",
            contact: s.contact ?? "",
            description: s.description ?? "",
            taxId: s.taxId ?? "",
            businessRegistrationNumber: s.businessRegistrationNumber ?? "",
            linkedDermatologist: !!s.linkedDermatologistId,
          });
        }
      })
      .catch(() => setError("Failed to load store profile."))
      .finally(() => setLoading(false));
  }, [partnerId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerId) return;
    const nameOk = form.name.trim().length > 0;
    const addressOk = form.address.trim().length > 0;
    const contactOk = form.contact.trim().length > 0;
    if (!nameOk || !addressOk || !contactOk) {
      setTouched({ name: true, address: true, contact: true });
      addToast("Please fill required fields (name, address, contact).", "error");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updatePartnerStore(partnerId, {
        name: form.name.trim(),
        address: form.address.trim(),
        openingHours: form.openingHours.trim(),
        contact: form.contact.trim(),
        description: form.description.trim(),
        taxId: form.taxId.trim(),
        businessRegistrationNumber: form.businessRegistrationNumber.trim(),
        linkedDermatologistId: form.linkedDermatologist ? partnerId : null,
      });
      if (updated) {
        setStore(updated);
        setLastSavedAt(new Date());
        addToast("Store profile saved.");
      }
    } catch {
      setError("Failed to save.");
      addToast("Failed to save store profile.", "error");
    } finally {
      setSaving(false);
    }
  };

  const completeness = profileCompleteness(form);
  const isLive = completeness >= 60 && form.name.trim() && form.address.trim() && form.contact.trim();
  const checklist = [
    { key: "name", label: "Store name", ok: form.name.trim().length > 0 },
    { key: "address", label: "Address", ok: form.address.trim().length > 0 },
    { key: "contact", label: "Contact", ok: form.contact.trim().length > 0 },
    { key: "hours", label: "Opening hours", ok: form.openingHours.trim().length > 0 },
    { key: "description", label: "Description", ok: form.description.trim().length > 0 },
  ];

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-8 w-48 rounded bg-muted/60 animate-pulse" />
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="h-96 rounded-xl border border-border/60 bg-muted/40 animate-pulse" />
          <div className="space-y-4">
            <div className="h-24 rounded-xl border border-border/60 bg-muted/40 animate-pulse" />
            <div className="h-32 rounded-xl border border-border/60 bg-muted/40 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !store) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-semibold">Store profile</h1>
          <p className="text-muted-foreground">Manage public-facing store details and business information.</p>
        </div>
        <Card className="border-border max-w-md">
          <CardContent className="py-6">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold">Store profile</h1>
        <p className="text-muted-foreground">
          Manage public-facing store details and business information.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading">Store details</CardTitle>
              <CardDescription>Name, address, hours, and contact. Required fields marked with *.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <section className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Public store info</h3>
                <div>
                  <Label htmlFor="name">Store name *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                    className={cn(
                      touched.name && !form.name.trim() && "border-destructive/60"
                    )}
                  />
                  {touched.name && !form.name.trim() && (
                    <p className="text-xs text-destructive mt-1">Store name is required.</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    onBlur={() => setTouched((t) => ({ ...t, address: true }))}
                    className={cn(
                      touched.address && !form.address.trim() && "border-destructive/60"
                    )}
                  />
                  {touched.address && !form.address.trim() && (
                    <p className="text-xs text-destructive mt-1">Address is required.</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="openingHours">Opening hours</Label>
                  <Input
                    id="openingHours"
                    value={form.openingHours}
                    onChange={(e) => setForm((f) => ({ ...f, openingHours: e.target.value }))}
                    placeholder="Mon–Sat 9AM–7PM"
                  />
                </div>
                <div>
                  <Label htmlFor="contact">Contact *</Label>
                  <Input
                    id="contact"
                    value={form.contact}
                    onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                    onBlur={() => setTouched((t) => ({ ...t, contact: true }))}
                    className={cn(
                      touched.contact && !form.contact.trim() && "border-destructive/60"
                    )}
                  />
                  {touched.contact && !form.contact.trim() && (
                    <p className="text-xs text-destructive mt-1">Contact is required.</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    rows={3}
                  />
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Business identifiers</h3>
                <div>
                  <Label htmlFor="taxId">Tax ID</Label>
                  <Input
                    id="taxId"
                    value={form.taxId}
                    onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="businessReg">Business registration number</Label>
                  <Input
                    id="businessReg"
                    value={form.businessRegistrationNumber}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, businessRegistrationNumber: e.target.value }))
                    }
                  />
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Operational settings</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="linkedDerm"
                    checked={form.linkedDermatologist}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, linkedDermatologist: e.target.checked }))
                    }
                    className="rounded border-input"
                  />
                  <Label htmlFor="linkedDerm">Linked dermatologist</Label>
                </div>
                <div>
                  <Label>Store banner</Label>
                  <p className="text-sm text-muted-foreground">Banner upload (connect backend).</p>
                </div>
              </section>

              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <span className="animate-spin mr-2 inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent" />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-sm">Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Visibility</span>
                  <Badge variant={isLive ? "success" : "secondary"}>
                    {isLive ? "LIVE" : "DRAFT"}
                  </Badge>
                </div>
                {lastSavedAt && (
                  <p className="text-xs text-muted-foreground">
                    Last updated: {lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Profile completeness</span>
                    <span>{completeness}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary/70 rounded-full transition-all duration-300"
                      style={{ width: `${completeness}%` }}
                    />
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/stores" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Public preview
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-sm">Quick checklist</CardTitle>
                <CardDescription>Required to go live</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {checklist.map((item) => (
                    <li
                      key={item.key}
                      className={cn(
                        "flex items-center gap-2 text-sm",
                        item.ok ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {item.ok ? (
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                      ) : (
                        <span className="h-4 w-4 rounded-full border border-current shrink-0" />
                      )}
                      {item.label}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="font-heading text-lg font-semibold">Public preview</h2>
          <p className="text-sm text-muted-foreground">
            How your store appears to customers. Keep name, address, and contact up to date for best visibility.
          </p>
          {store?.lat != null && store?.lng != null ? (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="font-heading text-base">Location</CardTitle>
                <CardDescription>Map pin (lazy-loaded).</CardDescription>
              </CardHeader>
              <CardContent>
                <StoreProfileMap lat={store.lat} lng={store.lng} />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border border-dashed">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Add and save your address to see the location preview on the map.
              </CardContent>
            </Card>
          )}
        </section>
      </form>
    </div>
  );
}
