"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AdminHeader,
  AdminPrimaryGrid,
} from "@/components/admin";
import { Breadcrumb } from "@/components/layouts/Breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, GripVertical, Trash2, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAdminRules,
  createAdminRule,
  deleteAdminRule,
} from "@/services/apiAdmin";
import {
  PanelToastProvider,
  usePanelToast,
} from "@/components/panel/PanelToast";
import {
  ADMIN_RULE_TYPES,
  type AdminRule,
  type AdminRuleType,
} from "@/types/rule";
import { safeFormatDateTime } from "@/lib/dateDisplay";

function listDateLabel(r: AdminRule): string {
  const raw = r.updatedAt ?? r.createdAt ?? "";
  const formatted = safeFormatDateTime(raw);
  if (formatted) return formatted.split(",")[0]?.trim() ?? "—";
  if (raw && String(raw).trim() !== "") return String(raw).slice(0, 10);
  return "—";
}

function sortRulesByNewest(list: AdminRule[]): AdminRule[] {
  return [...list].sort((a, b) => {
    const ta = a.updatedAt ?? a.createdAt ?? "";
    const tb = b.updatedAt ?? b.createdAt ?? "";
    const c = tb.localeCompare(ta);
    if (c !== 0) return c;
    return b.id.localeCompare(a.id);
  });
}

function AdminRuleEnginePageInner() {
  const { addToast } = usePanelToast();
  const [rules, setRules] = useState<AdminRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [logicMode, setLogicMode] = useState<"AND" | "OR">("AND");
  const [sandboxSkinType, setSandboxSkinType] = useState("Combination");
  const [sandboxConcern, setSandboxConcern] = useState("Hydration");
  const [sandboxAge, setSandboxAge] = useState("28");
  const [sandboxResult, setSandboxResult] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addRuleType, setAddRuleType] = useState<AdminRuleType>("blocked_keywords");
  const [addRuleValue, setAddRuleValue] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);

  const loadRules = useCallback(async (opts?: { withSkeleton?: boolean }) => {
    const showSkeleton = opts?.withSkeleton ?? true;
    if (showSkeleton) setLoading(true);
    try {
      const list = await getAdminRules();
      const safeRules = Array.isArray(list) ? list : [];
      const sorted = sortRulesByNewest(safeRules);
      setRules(sorted);
      setSelectedRuleId((prev) => {
        if (sorted.length === 0) return null;
        if (prev && sorted.some((r) => r.id === prev)) return prev;
        return sorted[0]?.id ?? null;
      });
    } finally {
      if (showSkeleton) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRules({ withSkeleton: true });
  }, [loadRules]);

  const safeRules = Array.isArray(rules) ? rules : [];
  const selectedRule = safeRules.find((r) => r.id === selectedRuleId);

  const runSandbox = () => {
    setSandboxResult(
      "Inputs saved for this run. Evaluating rules against profile data requires the recommendation service; the client does not execute the rule list."
    );
  };

  const openAddDialog = () => {
    setAddRuleType("blocked_keywords");
    setAddRuleValue("");
    setAddOpen(true);
  };

  const submitCreateRule = async () => {
    const trimmed = addRuleValue.trim();
    if (!trimmed) return;
    setAddSubmitting(true);
    try {
      await createAdminRule({ rule_type: addRuleType, rule_value: trimmed });
      addToast("Rule created");
      setAddOpen(false);
      await loadRules({ withSkeleton: false });
    } catch {
      addToast("Unable to update rule", "error");
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleDeleteRule = async () => {
    if (!selectedRule) return;
    if (
      !window.confirm(
        "Delete this rule? This cannot be undone."
      )
    ) {
      return;
    }
    const id = selectedRule.id;
    try {
      await deleteAdminRule(id);
      addToast("Rule deleted");
      await loadRules({ withSkeleton: false });
    } catch {
      addToast("Unable to update rule", "error");
    }
  };

  return (
    <>
      <AdminHeader
        title="Rules Engine"
        subtitle="Configure recommendation logic and product matching rules."
        breadcrumb={<Breadcrumb />}
      />

      <AdminPrimaryGrid className="gap-y-7">
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <Card className="border-border/60 h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm">Rule list</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="h-12 rounded-lg border border-border/60 bg-muted/40 animate-pulse"
                    />
                  ))}
                </div>
              ) : (
              <div className="flex flex-col">
                {safeRules.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">
                    No AI rules configured
                  </div>
                ) : (
                safeRules.map((rule) => {
                  const status = rule.isActive ? "active" : "draft";
                  return (
                  <button
                    key={rule.id}
                    type="button"
                    onClick={() => setSelectedRuleId(rule.id)}
                    className={cn(
                      "flex items-center gap-2 w-full text-left px-4 py-3 border-b border-border/60 hover:bg-muted/40 transition-colors",
                      selectedRuleId === rule.id && "bg-muted/50 border-l-2 border-l-primary"
                    )}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {rule.name?.trim() ? rule.name : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {listDateLabel(rule)}
                      </p>
                    </div>
                    <Badge variant={status === "active" ? "default" : "secondary"} className="shrink-0">
                      {status}
                    </Badge>
                  </button>
                  );
                })
                )}
              </div>
              )}
              <div className="p-2 border-t border-border/60">
                <Button variant="outline" size="sm" className="w-full" type="button" onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add rule
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="font-heading text-sm">Rule editor</CardTitle>
              {selectedRule ? (
                <p className="text-sm text-muted-foreground">
                  {selectedRule.name?.trim() ? selectedRule.name : "—"}
                </p>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedRule ? (
                <>
                  {selectedRule.description?.trim() ? (
                    <p className="text-sm text-muted-foreground">
                      {selectedRule.description}
                    </p>
                  ) : null}
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Logic</Label>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant={logicMode === "AND" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setLogicMode("AND")}
                      >
                        AND
                      </Button>
                      <Button
                        variant={logicMode === "OR" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setLogicMode("OR")}
                      >
                        OR
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-border/60 p-3 bg-muted/20 animate-in fade-in duration-200">
                      <p className="text-xs font-medium text-muted-foreground">Skin type condition</p>
                      <p className="text-sm mt-1">—</p>
                    </div>
                    <div className="rounded-lg border border-border/60 p-3 bg-muted/20 animate-in fade-in duration-200">
                      <p className="text-xs font-medium text-muted-foreground">Product category</p>
                      <p className="text-sm mt-1">—</p>
                    </div>
                    <div className="rounded-lg border border-border/60 p-3 bg-muted/20 animate-in fade-in duration-200">
                      <p className="text-xs font-medium text-muted-foreground">Severity weighting</p>
                      <p className="text-sm mt-1">—</p>
                    </div>
                    <div className="rounded-lg border border-border/60 p-3 bg-muted/20 animate-in fade-in duration-200">
                      <p className="text-xs font-medium text-muted-foreground">Priority</p>
                      <p className="text-sm mt-1">—</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" type="button">Save changes</Button>
                    <Button variant="outline" size="sm" type="button" onClick={() => void handleDeleteRule()}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </>
              ) : safeRules.length === 0 ? (
                <p className="text-sm text-muted-foreground">No AI rules configured</p>
              ) : (
                <p className="text-sm text-muted-foreground">Select a rule to edit.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="font-heading text-sm">Test rule sandbox</CardTitle>
            <p className="text-xs text-muted-foreground">Enter profile fields to stage a sandbox run.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label htmlFor="skin-type" className="text-xs">Skin type</Label>
                <Select value={sandboxSkinType} onValueChange={setSandboxSkinType}>
                  <SelectTrigger id="skin-type" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dry">Dry</SelectItem>
                    <SelectItem value="Oily">Oily</SelectItem>
                    <SelectItem value="Combination">Combination</SelectItem>
                    <SelectItem value="Sensitive">Sensitive</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="concern" className="text-xs">Primary concern</Label>
                <Select value={sandboxConcern} onValueChange={setSandboxConcern}>
                  <SelectTrigger id="concern" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hydration">Hydration</SelectItem>
                    <SelectItem value="Acne">Acne</SelectItem>
                    <SelectItem value="Anti-aging">Anti-aging</SelectItem>
                    <SelectItem value="Sensitivity">Sensitivity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="age" className="text-xs">Age</Label>
                <Input
                  id="age"
                  type="text"
                  value={sandboxAge}
                  onChange={(e) => setSandboxAge(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex items-end">
                <Button size="sm" onClick={runSandbox}>
                  <Play className="h-4 w-4 mr-2" />
                  Run
                </Button>
              </div>
            </div>
            {sandboxResult && (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                {sandboxResult}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Service-side results will appear here once the recommendation API is integrated.</p>
          </CardContent>
        </Card>
      </AdminPrimaryGrid>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add rule</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label htmlFor="rule-type" className="text-xs">Rule type</Label>
              <Select
                value={addRuleType}
                onValueChange={(v) => setAddRuleType(v as AdminRuleType)}
              >
                <SelectTrigger id="rule-type" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_RULE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="rule-value" className="text-xs">Value</Label>
              <Input
                id="rule-value"
                className="mt-1"
                value={addRuleValue}
                onChange={(e) => setAddRuleValue(e.target.value)}
                placeholder="e.g. keyword list or numeric limit"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={addSubmitting || !addRuleValue.trim()}
              onClick={() => void submitCreateRule()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AdminRuleEnginePage() {
  return (
    <PanelToastProvider>
      <AdminRuleEnginePageInner />
    </PanelToastProvider>
  );
}
