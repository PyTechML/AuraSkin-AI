"use client";

import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminPrimaryGrid } from "@/components/admin/AdminPrimaryGrid";
import { Breadcrumb } from "@/components/layouts/Breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell } from "lucide-react";

const TRIGGERS = ["Order placed", "Product approved", "User suspended", "Rule updated", "System alert"];
const SEVERITIES = ["Low", "Medium", "High", "Critical"];
const ROLES = ["Super Admin", "Platform Admin", "Moderator", "Support Admin"];

export default function AdminNotificationRulesPage() {
  const [rules, setRules] = useState<
    { trigger: string; severity: string; roles: string[] }[]
  >([
    { trigger: "Order placed", severity: "Medium", roles: ["Platform Admin"] },
    { trigger: "User suspended", severity: "High", roles: ["Platform Admin", "Super Admin"] },
  ]);

  const addRule = () => {
    setRules((prev) => [
      ...prev,
      { trigger: TRIGGERS[0], severity: SEVERITIES[0], roles: [ROLES[0]] },
    ]);
  };

  return (
    <>
      <AdminHeader
        title="Notification Rules"
        subtitle="Configure triggers, severity, and recipient roles."
        breadcrumb={<Breadcrumb />}
        actions={
          <Button size="sm" onClick={addRule}>
            Add rule
          </Button>
        }
      />

      <AdminPrimaryGrid>
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Rules
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              When a trigger fires, notifications are sent to the selected roles.
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {rules.map((rule, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-end gap-4 p-4 rounded-lg border border-border/60"
                >
                  <div className="flex-1 min-w-[140px]">
                    <Label className="text-xs">Trigger</Label>
                    <Select
                      value={rule.trigger}
                      onValueChange={(v) =>
                        setRules((prev) => {
                          const next = [...prev];
                          next[i] = { ...next[i], trigger: v };
                          return next;
                        })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRIGGERS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-32">
                    <Label className="text-xs">Severity</Label>
                    <Select
                      value={rule.severity}
                      onValueChange={(v) =>
                        setRules((prev) => {
                          const next = [...prev];
                          next[i] = { ...next[i], severity: v };
                          return next;
                        })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SEVERITIES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <Label className="text-xs">Recipient roles</Label>
                    <Select
                      value={rule.roles[0]}
                      onValueChange={(v) =>
                        setRules((prev) => {
                          const next = [...prev];
                          next[i] = { ...next[i], roles: [v] };
                          return next;
                        })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select roles" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRules((prev) => prev.filter((_, j) => j !== i))}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </AdminPrimaryGrid>
    </>
  );
}
