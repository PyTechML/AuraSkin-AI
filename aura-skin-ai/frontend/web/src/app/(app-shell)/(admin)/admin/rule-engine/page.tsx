"use client";

import { useState, useEffect } from "react";
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
import { Plus, GripVertical, Trash2, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAiRules, type AiRuleRow } from "@/services/apiAdmin";

interface RuleItem {
  id: string;
  name: string;
  status: "active" | "draft";
  priority: number;
  severity: string;
  updatedAt: string;
}

function mapApiRuleToItem(r: AiRuleRow): RuleItem {
  return {
    id: r.id,
    name: `${r.rule_type}: ${r.rule_value}`,
    status: "active",
    priority: 1,
    severity: "medium",
    updatedAt: (r.created_at ?? "").slice(0, 10),
  };
}

export default function AdminRuleEnginePage() {
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [logicMode, setLogicMode] = useState<"AND" | "OR">("AND");
  const [sandboxSkinType, setSandboxSkinType] = useState("Combination");
  const [sandboxConcern, setSandboxConcern] = useState("Hydration");
  const [sandboxAge, setSandboxAge] = useState("28");
  const [sandboxResult, setSandboxResult] = useState<string | null>(null);

  useEffect(() => {
    getAiRules()
      .then((apiRules) => {
        const mapped = apiRules.map(mapApiRuleToItem);
        setRules(mapped);
        if (mapped.length > 0 && !selectedRuleId) setSelectedRuleId(mapped[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedRule = rules.find((r) => r.id === selectedRuleId);

  const runSandbox = () => {
    setSandboxResult(
      `Preview: Would match rules for skin type "${sandboxSkinType}", concern "${sandboxConcern}", age ${sandboxAge}. Connect recommendation API for live results.`
    );
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
                <div className="p-4 text-sm text-muted-foreground">Loading rules…</div>
              ) : (
              <div className="flex flex-col">
                {rules.map((rule) => (
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
                      <p className="text-sm font-medium truncate">{rule.name}</p>
                      <p className="text-xs text-muted-foreground">
                        P{rule.priority} · {rule.severity} · {rule.updatedAt}
                      </p>
                    </div>
                    <Badge variant={rule.status === "active" ? "default" : "secondary"} className="shrink-0">
                      {rule.status}
                    </Badge>
                  </button>
                ))}
              </div>
              )}
              <div className="p-2 border-t border-border/60">
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add rule
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="font-heading text-sm">Rule editor</CardTitle>
              {selectedRule && (
                <p className="text-sm text-muted-foreground">{selectedRule.name}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedRule ? (
                <>
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
                      <p className="text-sm mt-1">Sensitive, Dry, Combination</p>
                    </div>
                    <div className="rounded-lg border border-border/60 p-3 bg-muted/20 animate-in fade-in duration-200">
                      <p className="text-xs font-medium text-muted-foreground">Product category</p>
                      <p className="text-sm mt-1">Cleanser, Moisturizer</p>
                    </div>
                    <div className="rounded-lg border border-border/60 p-3 bg-muted/20 animate-in fade-in duration-200">
                      <p className="text-xs font-medium text-muted-foreground">Severity weighting</p>
                      <p className="text-sm mt-1">High</p>
                    </div>
                    <div className="rounded-lg border border-border/60 p-3 bg-muted/20 animate-in fade-in duration-200">
                      <p className="text-xs font-medium text-muted-foreground">Priority</p>
                      <p className="text-sm mt-1">{selectedRule.priority}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm">Save changes</Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Select a rule to edit.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="font-heading text-sm">Test rule sandbox</CardTitle>
            <p className="text-xs text-muted-foreground">Enter user data to preview recommended products.</p>
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
            <p className="text-xs text-muted-foreground">Recommended products preview will appear here when connected to API.</p>
          </CardContent>
        </Card>
      </AdminPrimaryGrid>
    </>
  );
}
