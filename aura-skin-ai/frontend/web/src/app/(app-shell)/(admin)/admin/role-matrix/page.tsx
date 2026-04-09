"use client";

import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminPrimaryGrid } from "@/components/admin/AdminPrimaryGrid";
import { Breadcrumb } from "@/components/layouts/Breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Check } from "lucide-react";

const ROLES = ["Super Admin", "Platform Admin", "Moderator", "Support Admin"];
const ACTIONS = [
  "users.view", "users.create", "users.suspend", "users.edit_role",
  "stores.view", "stores.approve", "products.view", "products.approve",
  "audit.view", "rule_engine.view", "rule_engine.edit", "settings.edit",
  "feature_flags.edit", "role_matrix.edit",
];

export default function AdminRoleMatrixPage() {
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>(() => {
    const initial: Record<string, Record<string, boolean>> = {};
    ROLES.forEach((role, ri) => {
      initial[role] = {};
      ACTIONS.forEach((action, ai) => {
        initial[role][action] = ri === 0 || (ri <= 2 && !action.includes("role_matrix"));
      });
    });
    return initial;
  });
  const [saved, setSaved] = useState(false);

  const toggle = (role: string, action: string) => {
    setMatrix((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [action]: !prev[role]?.[action],
      },
    }));
    setSaved(false);
  };

  const handleSave = () => {
    // Stub: would call API to persist role matrix
    setSaved(true);
  };

  return (
    <>
      <AdminHeader
        title="Role Matrix"
        subtitle="Toggle permissions per role. Changes apply after save."
        breadcrumb={<Breadcrumb />}
        actions={
          <Button size="sm" onClick={handleSave}>
            Save changes
          </Button>
        }
      />

      <AdminPrimaryGrid>
        <Card className="border-border/60 overflow-hidden">
          <CardHeader>
            <CardTitle className="font-heading text-base">Roles vs actions</CardTitle>
            <p className="text-sm text-muted-foreground">
              Check to allow. Live enforcement preview: UI will hide or disable actions based on current user role.
            </p>
            {saved && (
              <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                <Check className="h-4 w-4" /> Saved.
              </p>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="text-left p-3 font-medium">Action</th>
                    {ROLES.map((role) => (
                      <th key={role} className="text-center p-3 font-medium w-28">
                        {role}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ACTIONS.map((action) => (
                    <tr key={action} className="border-b border-border/60 last:border-0">
                      <td className="p-3 text-muted-foreground font-mono text-xs">{action}</td>
                      {ROLES.map((role) => (
                        <td key={role} className="p-3 text-center">
                          <Switch
                            checked={!!matrix[role]?.[action]}
                            onCheckedChange={() => toggle(role, action)}
                            aria-label={`${role} ${action}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </AdminPrimaryGrid>
    </>
  );
}
