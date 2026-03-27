"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminHeader, AdminPrimaryGrid } from "@/components/admin";
import { Breadcrumb } from "@/components/layouts/Breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAssistantSettingsStore } from "@/store/assistantSettingsStore";
import { useAdminPermission } from "@/hooks/useAdminPermission";
import { getAdminSettings, saveAdminSettings } from "@/services/apiAdmin";

const TABS = [
  { value: "general", label: "General" },
  { value: "access", label: "Access Control" },
  { value: "flags", label: "Feature Flags" },
  { value: "payment", label: "Payment Configuration" },
  { value: "email", label: "Email Templates" },
  { value: "notifications", label: "Notification Rules" },
  { value: "assistant", label: "AI Assistant" },
];

const TOPICS: Array<{ key: string; label: string }> = [
  { key: "platform_navigation", label: "Platform navigation" },
  { key: "feature_usage", label: "How to use features" },
  { key: "store_management", label: "Store management help" },
  { key: "dermatologist_workflows", label: "Dermatologist workflows" },
  { key: "orders", label: "Orders" },
  { key: "reports", label: "Reports" },
  { key: "inventory", label: "Inventory" },
  { key: "rules_engine", label: "Rules engine" },
  { key: "analytics", label: "Analytics" },
  { key: "account_help", label: "Account help" },
];

export default function AdminSettingsPage() {
  const [flagRecommendations, setFlagRecommendations] = useState(true);
  const [flagConsultations, setFlagConsultations] = useState(true);
  const [siteName, setSiteName] = useState("AuraSkin AI");
  const [supportEmail, setSupportEmail] = useState("support@auraskin.ai");
  const [stripePublishableKey, setStripePublishableKey] = useState("");
  const [notificationRulesText, setNotificationRulesText] = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState<string | null>(null);

  const canEditAssistant = useAdminPermission("settings.edit");
  const assistant = useAssistantSettingsStore();

  const [usage, setUsage] = useState<{
    totalQueries: number;
    queriesByPanel: Record<string, number>;
    tokensUsedTotalApprox: number;
    averageTokensUsedApprox: number;
    dailyQueries: Record<string, number>;
  } | null>(null);
  const [assistantSaving, setAssistantSaving] = useState(false);
  const [assistantStatus, setAssistantStatus] = useState<string | null>(null);

  const dailyRows = useMemo(() => {
    const entries = Object.entries(usage?.dailyQueries ?? {});
    return entries.sort(([a], [b]) => (a < b ? 1 : -1)).slice(0, 7);
  }, [usage?.dailyQueries]);

  useEffect(() => {
    let active = true;
    fetch("/api/assistant/usage")
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (data?.ok) {
          setUsage({
            totalQueries: data.usage?.totalQueries ?? 0,
            queriesByPanel: data.usage?.queriesByPanel ?? {},
            tokensUsedTotalApprox: data.usage?.tokensUsedTotalApprox ?? 0,
            averageTokensUsedApprox: data.averageTokensUsedApprox ?? 0,
            dailyQueries: data.usage?.dailyQueries ?? {},
          });
        }
      })
      .catch(() => {
        // ignore
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    getAdminSettings()
      .then((data) => {
        if (!mounted) return;
        setSiteName(String(data.siteName ?? "AuraSkin AI"));
        setSupportEmail(String(data.supportEmail ?? "support@auraskin.ai"));
        setFlagRecommendations(Boolean(data.flagRecommendations ?? true));
        setFlagConsultations(Boolean(data.flagConsultations ?? true));
        setStripePublishableKey(String(data.stripePublishableKey ?? ""));
        setNotificationRulesText(String(data.notificationRulesText ?? ""));
      })
      .catch(() => {
        // ignore and keep defaults
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    setSettingsStatus(null);
    const saved = await saveAdminSettings({
      siteName,
      supportEmail,
      flagRecommendations,
      flagConsultations,
      stripePublishableKey,
      notificationRulesText,
      featureFlags: {
        recommendations: flagRecommendations,
        consultations: flagConsultations,
      },
    });
    setSettingsSaving(false);
    if (!saved) {
      setSettingsStatus("Save failed.");
      return;
    }
    setSettingsStatus("Saved.");
  };

  return (
    <>
      <AdminHeader
        title="Settings"
        subtitle="General, access, features, and notifications."
        breadcrumb={<Breadcrumb />}
      />

      <AdminPrimaryGrid>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="general" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="font-heading text-sm">General</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="site-name" className="text-xs">Site name</Label>
                    <Input id="site-name" value={siteName} onChange={(e) => setSiteName(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="support-email" className="text-xs">Support email</Label>
                    <Input id="support-email" type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} className="mt-1" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" size="sm" onClick={() => void handleSaveSettings()} disabled={settingsSaving}>
                      {settingsSaving ? "Saving…" : "Save settings"}
                    </Button>
                    {settingsStatus ? <span className="text-xs text-muted-foreground">{settingsStatus}</span> : null}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="font-heading text-sm">Help</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Configure support link and documentation URL here.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="access" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="font-heading text-sm">Access Control</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">Role types: Super Admin, Platform Admin, Moderator, Support Admin. Configure permissions per role.</p>
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="font-heading text-sm">Permissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Map roles to modules and actions. Connect to backend when available.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="flags" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="font-heading text-sm">Feature Flags</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="flag-recommendations" className="text-sm">AI recommendations</Label>
                    <Switch id="flag-recommendations" checked={flagRecommendations} onCheckedChange={setFlagRecommendations} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="flag-consultations" className="text-sm">Dermatologist consultations</Label>
                    <Switch id="flag-consultations" checked={flagConsultations} onCheckedChange={setFlagConsultations} />
                  </div>
                  <Button type="button" size="sm" onClick={() => void handleSaveSettings()} disabled={settingsSaving}>
                    {settingsSaving ? "Saving…" : "Save flags"}
                  </Button>
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="font-heading text-sm">Info</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Toggle features globally. Restrict by role in Access Control.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="payment" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="font-heading text-sm">Payment Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="stripe-key" className="text-xs">Stripe publishable key</Label>
                    <Input id="stripe-key" type="password" placeholder="pk_…" className="mt-1" value={stripePublishableKey} onChange={(e) => setStripePublishableKey(e.target.value)} />
                  </div>
                  <Button type="button" size="sm" onClick={() => void handleSaveSettings()} disabled={settingsSaving}>
                    {settingsSaving ? "Saving…" : "Save payment config"}
                  </Button>
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="font-heading text-sm">Payouts</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Configure payout schedule and thresholds. Connect payment provider.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="email" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="font-heading text-sm">Email Templates</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Welcome, password reset, order confirmation. Edit templates when email service is connected.</p>
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="font-heading text-sm">Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Preview placeholder.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="font-heading text-sm">Notification Rules</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">When to notify admins: new product pending, store application, flagged content.</p>
                  <Textarea
                    value={notificationRulesText}
                    onChange={(e) => setNotificationRulesText(e.target.value)}
                    placeholder="Notification rules and triggers"
                    className="min-h-[140px]"
                  />
                  <Button type="button" size="sm" onClick={() => void handleSaveSettings()} disabled={settingsSaving}>
                    {settingsSaving ? "Saving…" : "Save notification rules"}
                  </Button>
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="font-heading text-sm">Channels</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Email, in-app. Configure per rule.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="assistant" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="font-heading text-sm">AI Assistant</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label className="text-sm">Enable assistant globally</Label>
                      <p className="text-xs text-muted-foreground">
                        Shows the floating assistant in authenticated panels.
                      </p>
                    </div>
                    <Switch
                      checked={assistant.enabled}
                      onCheckedChange={(v) => assistant.updateSettings({ enabled: v })}
                      disabled={!canEditAssistant}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm">Enable per panel</Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(
                        [
                          ["USER", "User Panel"],
                          ["ADMIN", "Admin Panel"],
                          ["STORE", "Store Panel"],
                          ["DERMATOLOGIST", "Dermatologist Panel"],
                        ] as const
                      ).map(([role, label]) => (
                        <div key={role} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
                          <span className="text-sm">{label}</span>
                          <Switch
                            checked={assistant.enabledForRole[role]}
                            onCheckedChange={(v) =>
                              assistant.updateSettings({
                                enabledForRole: {
                                  ...assistant.enabledForRole,
                                  [role]: v,
                                },
                              })
                            }
                            disabled={!canEditAssistant}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="asst-max-hour" className="text-xs">
                        Max messages per hour
                      </Label>
                      <Input
                        id="asst-max-hour"
                        type="number"
                        min={1}
                        value={assistant.maxPerHour}
                        onChange={(e) =>
                          assistant.updateSettings({
                            maxPerHour: Math.max(1, Number(e.target.value || 0)),
                          })
                        }
                        className="mt-1"
                        disabled={!canEditAssistant}
                      />
                    </div>
                    <div>
                      <Label htmlFor="asst-max-minute" className="text-xs">
                        Max requests per minute
                      </Label>
                      <Input
                        id="asst-max-minute"
                        type="number"
                        min={1}
                        value={assistant.maxPerMinute}
                        onChange={(e) =>
                          assistant.updateSettings({
                            maxPerMinute: Math.max(1, Number(e.target.value || 0)),
                          })
                        }
                        className="mt-1"
                        disabled={!canEditAssistant}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm">Allowed topics</Label>
                    <div className="grid gap-2">
                      {TOPICS.map((t) => {
                        const checked = assistant.allowedTopics.includes(t.key);
                        return (
                          <label
                            key={t.key}
                            className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => {
                                const next = new Set(assistant.allowedTopics);
                                if (v) next.add(t.key);
                                else next.delete(t.key);
                                assistant.updateSettings({
                                  allowedTopics: Array.from(next),
                                });
                              }}
                              disabled={!canEditAssistant}
                            />
                            <span>{t.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="asst-prompt" className="text-sm">
                      System prompt
                    </Label>
                    <Textarea
                      id="asst-prompt"
                      value={assistant.systemPrompt}
                      onChange={(e) =>
                        assistant.updateSettings({ systemPrompt: e.target.value })
                      }
                      className="mt-2 min-h-[140px] rounded-xl"
                      disabled={!canEditAssistant}
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Keep this strict: the assistant must only answer AuraSkin
                      feature and navigation questions.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      className="admin-btn-lift"
                      disabled={!canEditAssistant || assistantSaving}
                      onClick={async () => {
                        setAssistantSaving(true);
                        setAssistantStatus(null);
                        try {
                          const res = await fetch("/api/assistant/settings", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              enabled: assistant.enabled,
                              enabledForRole: assistant.enabledForRole,
                              maxPerMinute: assistant.maxPerMinute,
                              maxPerHour: assistant.maxPerHour,
                              allowedTopics: assistant.allowedTopics,
                              systemPrompt: assistant.systemPrompt,
                            }),
                          });
                          const data = await res.json();
                          if (data?.ok) setAssistantStatus("Saved.");
                          else setAssistantStatus("Save failed.");
                        } catch {
                          setAssistantStatus("Save failed.");
                        } finally {
                          setAssistantSaving(false);
                        }
                      }}
                    >
                      {assistantSaving ? "Saving…" : "Save assistant settings"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!canEditAssistant}
                      onClick={() => {
                        assistant.resetToDefaults();
                        setAssistantStatus("Reset to defaults.");
                      }}
                    >
                      Reset
                    </Button>
                    {assistantStatus ? (
                      <span className="text-sm text-muted-foreground">
                        {assistantStatus}
                      </span>
                    ) : null}
                  </div>

                  {!canEditAssistant ? (
                    <p className="text-xs text-muted-foreground">
                      You don’t have permission to edit assistant settings.
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="font-heading text-sm">Usage statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">Total queries</p>
                      <p className="text-2xl font-heading font-semibold">{usage?.totalQueries ?? 0}</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">Avg tokens (approx)</p>
                      <p className="text-2xl font-heading font-semibold">{usage?.averageTokensUsedApprox ?? 0}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Queries per panel</p>
                    <div className="mt-2 grid gap-2 text-sm">
                      {(["user", "admin", "store", "dermatologist"] as const).map((k) => (
                        <div key={k} className="flex items-center justify-between">
                          <span className="capitalize">{k}</span>
                          <span className="font-medium">{(usage?.queriesByPanel?.[k] ?? 0) as number}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Daily usage (recent)</p>
                    <div className="mt-2 grid gap-2 text-sm">
                      {dailyRows.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No usage yet.</p>
                      ) : (
                        dailyRows.map(([day, count]) => (
                          <div key={day} className="flex items-center justify-between">
                            <span>{day}</span>
                            <span className="font-medium">{count}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </AdminPrimaryGrid>
    </>
  );
}
