"use client";

import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminPrimaryGrid } from "@/components/admin/AdminPrimaryGrid";
import { Breadcrumb } from "@/components/layouts/Breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Flag } from "lucide-react";

const PANELS = ["User app", "Store panel", "Dermatologist panel", "Admin panel"];

export default function AdminFeatureFlagsPage() {
  const [flags, setFlags] = useState<Record<string, boolean>>({
    recommendations: true,
    consultations: true,
    beta_analytics: false,
    new_rule_builder: false,
  });
  const [rolloutPercent, setRolloutPercent] = useState(100);

  const toggle = (key: string) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <AdminHeader
        title="Feature Flags"
        subtitle="Toggle features per panel and control rollout percentage."
        breadcrumb={<Breadcrumb />}
      />

      <AdminPrimaryGrid>
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <Flag className="h-4 w-4" />
              Feature toggles
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Enable or disable features across the platform.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(flags).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="font-mono text-sm">
                  {key.replace(/_/g, " ")}
                </Label>
                <Switch checked={value} onCheckedChange={() => toggle(key)} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="font-heading text-sm">Beta features</CardTitle>
            <p className="text-xs text-muted-foreground">
              New rule builder and analytics are gated by beta flag.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label>New rule builder</Label>
              <Switch
                checked={flags.new_rule_builder}
                onCheckedChange={() => toggle("new_rule_builder")}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="font-heading text-sm">Rollout percentage</CardTitle>
            <p className="text-xs text-muted-foreground">
              Percentage of users who see beta features (when enabled).
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center gap-4">
                <Label className="text-muted-foreground">Rollout %</Label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={rolloutPercent}
                  onChange={(e) => setRolloutPercent(Number(e.target.value))}
                  className="flex-1 max-w-[200px]"
                />
                <span className="font-medium w-10">{rolloutPercent}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </AdminPrimaryGrid>
    </>
  );
}
