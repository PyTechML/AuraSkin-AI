"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import {
  getPartnerBalance,
  getPartnerPayouts,
  getPartnerBankAccount,
  requestWithdrawal,
  type PartnerBankAccount,
} from "@/services/apiPartner";
import type { Payout } from "@/types";
import { usePanelToast } from "@/components/panel/PanelToast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Breadcrumb } from "@/components/layouts/Breadcrumb";
import { PanelStagger, PanelStaggerItem } from "@/components/panel/PanelReveal";
import { PanelEmptyState } from "@/components/panel/PanelEmptyState";
import { downloadCsv } from "@/lib/csvExport";
import { Wallet, Download, ArrowRight, CheckCircle } from "lucide-react";

const MIN_WITHDRAWAL_THRESHOLD = 20;

export default function StorePayoutsPage() {
  const { session } = useAuth();
  const partnerId = session?.user?.id ?? "";
  const { addToast } = usePanelToast();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [balance, setBalance] = useState<{
    totalEarnings: number;
    availableBalance: number;
    pendingSettlement: number;
  } | null>(null);
  const [bank, setBank] = useState<PartnerBankAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [highlightFirstRow, setHighlightFirstRow] = useState(false);

  const load = () => {
    if (!partnerId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      getPartnerPayouts(partnerId),
      getPartnerBalance(partnerId),
      getPartnerBankAccount(partnerId),
    ])
      .then(([p, b, bankAccount]) => {
        setPayouts(p);
        setBalance(b);
        setBank(bankAccount);
      })
      .catch(() => setError("Failed to load payout information."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [partnerId]);

  const lastWithdrawal = useMemo(() => {
    const completed = payouts.filter((p) => p.status === "completed");
    if (completed.length === 0) return null;
    const sorted = [...completed].sort(
      (a, b) => new Date(b.completedAt ?? b.createdAt).getTime() - new Date(a.completedAt ?? a.createdAt).getTime()
    );
    return sorted[0];
  }, [payouts]);

  const filteredPayouts = useMemo(() => {
    if (statusFilter === "all") return payouts;
    return payouts.filter((p) => p.status === statusFilter);
  }, [payouts, statusFilter]);

  const canWithdraw =
    balance &&
    balance.availableBalance >= MIN_WITHDRAWAL_THRESHOLD &&
    (() => {
      const amount = parseFloat(withdrawAmount);
      return !isNaN(amount) && amount >= MIN_WITHDRAWAL_THRESHOLD && amount <= balance.availableBalance;
    })();

  const handleWithdraw = async () => {
    if (!partnerId || !balance || !canWithdraw) return;
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < MIN_WITHDRAWAL_THRESHOLD || amount > balance.availableBalance) {
      addToast(`Minimum withdrawal is $${MIN_WITHDRAWAL_THRESHOLD}.`, "error");
      return;
    }
    setSubmitting(true);
    try {
      await requestWithdrawal(partnerId, amount);
      setWithdrawAmount("");
      await load();
      setHighlightFirstRow(true);
      setTimeout(() => setHighlightFirstRow(false), 2500);
      addToast("Withdrawal request submitted.");
    } catch {
      addToast("Failed to submit withdrawal.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCsv = () => {
    const headers = ["Date", "Amount", "Status", "Completed"];
    const rows = filteredPayouts.map((p) => [
      p.createdAt,
      p.amount.toFixed(2),
      p.status,
      p.completedAt ?? "",
    ]);
    downloadCsv(headers, rows, "payout-history.csv");
  };

  if (loading && !balance) {
    return (
      <div className="space-y-8">
        <Breadcrumb />
        <div className="space-y-2">
          <div className="h-8 w-52 rounded bg-muted/40 animate-pulse" />
          <div className="h-5 w-80 rounded bg-muted/30 animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl border border-border/60 bg-muted/30 animate-pulse"
            />
          ))}
        </div>
        <div className="h-40 rounded-xl border border-border/60 bg-muted/30 animate-pulse" />
      </div>
    );
  }

  if (error && !balance) {
    return (
      <div className="space-y-8">
        <Breadcrumb />
        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-semibold">Payouts</h1>
          <p className="text-muted-foreground">
            Track earnings, settlements, and withdrawal history for your store.
          </p>
        </div>
        <Card className="border-border max-w-md">
          <CardContent className="py-6">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={load}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const b = balance!;

  return (
    <div className="space-y-8 pb-12">
      <Breadcrumb />

      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold">Payouts</h1>
        <p className="text-muted-foreground">
          Track earnings, settlements, and withdrawal history for your store.
        </p>
      </div>

      <PanelStagger className="grid gap-4 md:grid-cols-4">
        <PanelStaggerItem>
          <Card className="border-border partner-card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm text-muted-foreground">
                Total earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">${b.totalEarnings.toFixed(2)}</p>
            </CardContent>
          </Card>
        </PanelStaggerItem>
        <PanelStaggerItem>
          <Card className="border-border partner-card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm text-muted-foreground">
                Available balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">${b.availableBalance.toFixed(2)}</p>
            </CardContent>
          </Card>
        </PanelStaggerItem>
        <PanelStaggerItem>
          <Card className="border-border partner-card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm text-muted-foreground">
                Pending settlement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">${b.pendingSettlement.toFixed(2)}</p>
            </CardContent>
          </Card>
        </PanelStaggerItem>
        <PanelStaggerItem>
          <Card className="border-border partner-card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Last withdrawal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lastWithdrawal ? (
                <>
                  <p className="text-2xl font-semibold">${lastWithdrawal.amount.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {lastWithdrawal.completedAt ?? lastWithdrawal.createdAt}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No withdrawals yet.</p>
              )}
            </CardContent>
          </Card>
        </PanelStaggerItem>
      </PanelStagger>

      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-sm">Settlement timeline</CardTitle>
          <CardDescription>
            How your balance becomes available and gets paid out.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">Balance</span>
              <span className="text-muted-foreground">Earnings from orders</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-2">
              <span className="font-medium">Pending settlement</span>
              <span className="text-muted-foreground">1–3 business days</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-2">
              <span className="font-medium">Processing</span>
              <span className="text-muted-foreground">Withdrawal request</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
              <span className="font-medium">Paid</span>
              <span className="text-muted-foreground">To your bank</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Typical settlement: 1–3 business days. Withdrawals are processed according to the platform schedule.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-heading text-base">Withdrawal request</CardTitle>
            <CardDescription>
              Request a transfer from your available balance to your linked bank account. Minimum ${MIN_WITHDRAWAL_THRESHOLD}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="number"
                min={MIN_WITHDRAWAL_THRESHOLD}
                max={b.availableBalance}
                step={0.01}
                className="max-w-[200px]"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Amount"
              />
              <Button
                disabled={
                  submitting ||
                  b.availableBalance < MIN_WITHDRAWAL_THRESHOLD ||
                  !canWithdraw
                }
                onClick={handleWithdraw}
              >
                {submitting ? (
                  <>
                    <span className="animate-spin mr-2 inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent" />
                    Submitting…
                  </>
                ) : (
                  "Request withdrawal"
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {b.availableBalance < MIN_WITHDRAWAL_THRESHOLD
                ? `Balance ($${b.availableBalance.toFixed(2)}) is below the $${MIN_WITHDRAWAL_THRESHOLD} minimum. Add more sales to withdraw.`
                : `Withdrawals are processed according to the platform payout schedule. New requests appear in your history below.`}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading text-base">Bank details</CardTitle>
            <CardDescription>
              Destination account for your payouts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {bank ? (
              <>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Bank</span>
                  <span className="font-medium">{bank.bankName}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Account</span>
                  <span className="font-medium">•••• {bank.accountNumberLast4}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Routing</span>
                  <span>{bank.routingNumber}</span>
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">
                No bank account on file yet. Add your payout details from the profile or
                onboarding flow.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="font-heading text-base">Transaction history</CardTitle>
            <CardDescription>
              Completed and pending payouts associated with your store.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="h-4 w-4 mr-1.5" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPayouts.length === 0 ? (
            <PanelEmptyState
              icon={<Wallet className="h-12 w-12" />}
              title="No withdrawals yet"
              description="Once you request a withdrawal, it will appear here with its current processing status."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayouts.map((p, i) => (
                  <TableRow
                    key={p.id}
                    className={highlightFirstRow && i === 0 ? "bg-muted/50" : undefined}
                  >
                    <TableCell>{p.createdAt}</TableCell>
                    <TableCell>${p.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.status === "completed"
                            ? "success"
                            : p.status === "pending"
                              ? "outline"
                              : "secondary"
                        }
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{p.completedAt ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
