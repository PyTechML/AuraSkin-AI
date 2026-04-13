"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthContext";
import {
  getDermatologistProfile,
  updateDermatologistProfile,
} from "@/services/apiPartner";
import { usePanelToast } from "@/components/panel/PanelToast";
import type { NormalizedDermatologistProfile } from "@/types/profile";
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
  const { addToast } = usePanelToast();
  const dermatologistId = session?.user?.id ?? "";
  const defaultProfile: NormalizedDermatologistProfile = {
    id: "",
    name: "",
    email: "",
    specialization: "",
    yearsExperience: 0,
    consultationFee: 0,
    clinicName: "",
    clinicAddress: "",
    bio: "",
    phone: "",
    profileImage: "",
  };
  const [profile, setProfile] = useState<NormalizedDermatologistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    specialty: "",
    yearsExperience: "",
    bio: "",
    consultationFee: "",
    clinicAddress: "",
  });

  useEffect(() => {
    let cancelled = false;
    if (!dermatologistId) {
      setError("Unable to load profile.");
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }
    setLoading(true);
    setError(null);
    getDermatologistProfile()
      .then((d) => {
        if (cancelled) return;
        const safeProfile = d ?? defaultProfile;
        setProfile(safeProfile);
        setForm({
          name: safeProfile.name ?? "",
          specialty: safeProfile.specialization ?? "",
          yearsExperience: (Number(safeProfile.yearsExperience) || 0).toString(),
          bio: safeProfile.bio ?? "",
          consultationFee: (Number(safeProfile.consultationFee) || 0).toString(),
          clinicAddress: safeProfile.clinicAddress ?? "",
        });
      })
      .catch(() => {
        if (cancelled) return;
        setError("Failed to load profile.");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dermatologistId]);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dermatologistId) {
      addToast("Unable to update profile. Please try again.", "error");
      return;
    }
    setSaving(true);
    setError(null);
    const baseProfile = profile ?? defaultProfile;
    const yearsExperienceRaw = Number.parseInt(form.yearsExperience, 10);
    const consultationFeeRaw = Number.parseFloat(form.consultationFee);
    const payload: NormalizedDermatologistProfile = {
      ...baseProfile,
      id: baseProfile.id || dermatologistId,
      name: form.name.trim(),
      specialization: form.specialty.trim(),
      yearsExperience: Number.isFinite(yearsExperienceRaw)
        ? yearsExperienceRaw
        : baseProfile.yearsExperience,
      consultationFee: Number.isFinite(consultationFeeRaw)
        ? consultationFeeRaw
        : baseProfile.consultationFee,
      clinicAddress: form.clinicAddress.trim(),
      bio: form.bio.trim(),
    };
    try {
      const updated = await updateDermatologistProfile(payload);
      const safeUpdated = updated ?? defaultProfile;
      setProfile(safeUpdated);
      setForm((prev) => ({
        ...prev,
        name: safeUpdated.name ?? "",
        specialty: safeUpdated.specialization ?? "",
        yearsExperience: (Number(safeUpdated.yearsExperience) || 0).toString(),
        consultationFee: (Number(safeUpdated.consultationFee) || 0).toString(),
        clinicAddress: safeUpdated.clinicAddress ?? "",
        bio: safeUpdated.bio ?? "",
      }));
      addToast("Profile updated successfully.", "success");
    } catch {
      setError("Unable to update profile. Please try again.");
      addToast("Unable to update profile. Please try again.", "error");
    } finally {
      setSaving(false);
    }
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
            <Button
              variant="outline"
              onClick={() => {
                setLoading(true);
                setError(null);
                getDermatologistProfile()
                  .then((d) => {
                    const safeProfile = d ?? defaultProfile;
                    setProfile(safeProfile);
                    setForm({
                      name: safeProfile.name ?? "",
                      specialty: safeProfile.specialization ?? "",
                      yearsExperience: (Number(safeProfile.yearsExperience) || 0).toString(),
                      bio: safeProfile.bio ?? "",
                      consultationFee: (Number(safeProfile.consultationFee) || 0).toString(),
                      clinicAddress: safeProfile.clinicAddress ?? "",
                    });
                  })
                  .catch(() => setError("Failed to load profile."))
                  .finally(() => setLoading(false));
              }}
            >
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

      <p className="text-sm text-muted-foreground mb-2 max-w-3xl mx-auto text-center sm:text-left">
        Information here is visible to patients booking consultations and helps set expectations before a consultation.
      </p>
      <PanelSectionReveal>
      <form onSubmit={handleSave} className="max-w-3xl mx-auto w-full">
        <Card className="border-border w-full">
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

