"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { getDermatologistById } from "@/services/api";
import type { Dermatologist } from "@/types";
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
import { Textarea } from "@/components/ui/textarea";
import { PanelPageHeader } from "@/components/layouts/PanelPageHeader";
import { PanelSectionReveal } from "@/components/panel/PanelReveal";

export default function DermatologistProfilePage() {
  const { session } = useAuth();
  const dermatologistId = session?.user?.id ?? "derm-1";
  const [profile, setProfile] = useState<Dermatologist | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    specialty: "",
    yearsExperience: "",
    certifications: "",
    bio: "",
    consultationFee: "",
    clinicAddress: "",
  });

  useEffect(() => {
    setLoading(true);
    setError(null);
    getDermatologistById(dermatologistId)
      .then((d) => {
        setProfile(d);
        if (d) {
          setForm({
            name: d.name ?? "",
            specialty: d.specialty ?? "",
            yearsExperience: d.yearsExperience?.toString() ?? "",
            certifications: (d.certifications ?? []).join(", "),
            bio: d.bio ?? "",
            consultationFee: d.consultationFee?.toString() ?? "",
            clinicAddress: d.clinicAddress ?? "",
          });
        }
      })
      .catch(() => setError("Failed to load profile."))
      .finally(() => setLoading(false));
  }, [dermatologistId]);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    // In this demo, we only update local state; a real app would persist via API.
    const updated: Dermatologist = {
      ...profile,
      name: form.name,
      specialty: form.specialty,
      yearsExperience: form.yearsExperience
        ? parseInt(form.yearsExperience, 10)
        : profile.yearsExperience,
      certifications: form.certifications
        ? form.certifications.split(",").map((c) => c.trim())
        : profile.certifications,
      bio: form.bio,
      consultationFee: form.consultationFee
        ? parseFloat(form.consultationFee)
        : profile.consultationFee,
      clinicAddress: form.clinicAddress,
    };
    setProfile(updated);
    setSaving(false);
  };

  if (loading && !profile) {
    return (
      <div className="space-y-6">
        <PanelPageHeader
          title="Profile"
          subtitle="Manage your professional and public information."
        />
        <div className="h-64 rounded-xl border border-border/60 bg-muted/40 animate-pulse" />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="space-y-6">
        <PanelPageHeader
          title="Profile"
          subtitle="Manage your professional and public information."
        />
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
    <div className="space-y-6">
      <PanelPageHeader
        title="Profile"
        subtitle="Manage your professional and public information."
      />

      <p className="text-sm text-muted-foreground mb-2">
        Information here is visible to patients booking consultations and helps set expectations before a consultation.
      </p>
      <PanelSectionReveal>
      <form onSubmit={handleSave}>
        <Card className="border-border max-w-2xl">
          <CardHeader>
            <CardTitle className="font-heading">
              Professional details
            </CardTitle>
            <CardDescription>
              Name, specialization, experience, and clinic details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="specialization">Specialization</Label>
              <Input
                id="specialization"
                value={form.specialty}
                onChange={(e) => handleChange("specialty", e.target.value)}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="experience">Years of experience</Label>
                <Input
                  id="experience"
                  type="number"
                  min="0"
                  value={form.yearsExperience}
                  onChange={(e) =>
                    handleChange("yearsExperience", e.target.value)
                  }
                />
              </div>
              <div>
                <Label htmlFor="fee">Consultation fee</Label>
                <Input
                  id="fee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.consultationFee}
                  onChange={(e) =>
                    handleChange("consultationFee", e.target.value)
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="certifications">Certifications</Label>
              <Input
                id="certifications"
                value={form.certifications}
                onChange={(e) =>
                  handleChange("certifications", e.target.value)
                }
                placeholder="Comma-separated list"
              />
            </div>
            <div>
              <Label htmlFor="clinicAddress">Clinic address (optional)</Label>
              <Input
                id="clinicAddress"
                value={form.clinicAddress}
                onChange={(e) =>
                  handleChange("clinicAddress", e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={form.bio}
                onChange={(e) => handleChange("bio", e.target.value)}
                rows={4}
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </CardContent>
        </Card>
      </form>
      </PanelSectionReveal>
    </div>
  );
}

