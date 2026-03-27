"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  getOrderByIdForPartner,
  updateOrderStatus,
  getNextOrderStatuses,
  updateOrderTracking,
  addOrderNote,
} from "@/services/apiPartner";
import { useAuth } from "@/providers/AuthProvider";
import type { Order } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { ImageIcon, ArrowLeft, Check } from "lucide-react";
import {
  isDocumentVisible,
  PANEL_LIVE_POLL_INTERVAL_MS,
} from "@/lib/panelPolling";
import {
  formatOrderStatusLabel,
  formatStoreCustomerDisplay,
} from "@/lib/storeOrderDisplay";

const TIMELINE_STEPS: Order["status"][] = [
  "placed",
  "confirmed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
];

export default function StoreOrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const { session } = useAuth();
  const partnerId = session?.user?.id ?? "";
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [trackingInput, setTrackingInput] = useState("");
  const [noteInput, setNoteInput] = useState("");

  const load = (silent = false) => {
    if (!partnerId || !orderId) return;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    getOrderByIdForPartner(orderId, partnerId)
      .then((data) => {
        if (data != null) {
          setOrder(data);
          if (!silent) setError(null);
        } else if (!silent) {
          setOrder(null);
        }
      })
      .catch(() => {
        if (!silent) {
          setError("Failed to load order.");
          setOrder(null);
        }
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  };

  useEffect(() => {
    load(false);
  }, [partnerId, orderId]);

  useEffect(() => {
    if (!partnerId || !orderId) return;
    const id = window.setInterval(() => {
      if (!isDocumentVisible()) return;
      load(true);
    }, PANEL_LIVE_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [partnerId, orderId]);

  useEffect(() => {
    if (order?.trackingNumber) setTrackingInput(order.trackingNumber);
  }, [order?.trackingNumber]);

  const handleStatusChange = (newStatus: Order["status"]) => {
    if (!order) return;
    setUpdating(true);
    updateOrderStatus(order.id, newStatus)
      .then((updated) => {
        if (updated) setOrder(updated);
      })
      .finally(() => setUpdating(false));
  };

  const handleSaveTracking = async () => {
    if (!orderId || !partnerId || !trackingInput.trim()) return;
    setUpdating(true);
    const updated = await updateOrderTracking(orderId, partnerId, trackingInput.trim());
    if (updated) setOrder(updated);
    setUpdating(false);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || !partnerId || !noteInput.trim()) return;
    setUpdating(true);
    const updated = await addOrderNote(orderId, partnerId, noteInput.trim());
    if (updated) {
      setOrder(updated);
      setNoteInput("");
    }
    setUpdating(false);
  };

  if (loading && !order) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 rounded bg-muted/60 animate-pulse" />
        <div className="h-48 rounded-xl border border-border/60 bg-muted/40 animate-pulse" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/store/orders">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to orders
          </Link>
        </Button>
        <Card className="border-border max-w-md">
          <CardContent className="py-6">
            <p className="text-muted-foreground">
              {error ?? "Order not found."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const nextStatuses = getNextOrderStatuses(order.status);
  const currentStepIndex = TIMELINE_STEPS.indexOf(order.status);
  const showRefundPanel =
    order.status === "refunded" || order.status === "return_requested";
  const customerDisplay = formatStoreCustomerDisplay(order);

  return (
    <div className="space-y-8">
      <Button variant="outline" size="sm" asChild>
        <Link href="/store/orders">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to orders
        </Link>
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">
          Order #{order.id.replace("ord-", "")}
        </h1>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              order.status === "delivered"
                ? "success"
                : order.status === "cancelled" || order.status === "refunded"
                ? "secondary"
                : "outline"
            }
          >
            {formatOrderStatusLabel(order.status)}
          </Badge>
          <Badge variant="outline">
            {formatOrderStatusLabel(order.paymentStatus ?? "paid")}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-lg">
                Customer information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Name</span>
                <p className="font-medium">{customerDisplay.primary}</p>
              </div>
              {order.userId ? (
                <div>
                  <span className="text-muted-foreground">Account ID</span>
                  <p
                    className="font-mono text-xs text-muted-foreground truncate max-w-full"
                    title={order.userId}
                  >
                    …{order.userId.slice(-8)}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-lg">
                Shipping address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {order.shippingAddress || "No shipping address provided."}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Order items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.items.map((item) => (
                <div key={item.productId} className="flex gap-4">
                  <div className="w-16 h-16 shrink-0 rounded-lg bg-muted/80 flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">
                      ${item.price.toFixed(2)} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-medium">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-lg">
                Order timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {TIMELINE_STEPS.map((step, i) => {
                  const reached = currentStepIndex >= i;
                  return (
                    <div key={step} className="flex items-center flex-shrink-0">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-label ${
                          reached
                            ? "bg-accent text-accent-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {reached ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          i + 1
                        )}
                      </div>
                      <span
                        className={`ml-1 text-xs hidden sm:inline ${
                          reached
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {step.replace(/_/g, " ")}
                      </span>
                      {i < TIMELINE_STEPS.length - 1 && (
                        <div
                          className={`w-4 sm:w-8 h-0.5 mx-1 ${
                            reached ? "bg-accent" : "bg-muted"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              {order.deliveryEstimate && (
                <p className="text-sm text-muted-foreground mt-2">
                  Est. delivery: {order.deliveryEstimate}
                </p>
              )}
            </CardContent>
          </Card>

          {order.activityLog && order.activityLog.length > 0 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="font-heading text-lg">
                  Activity log
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {order.activityLog.map((entry, i) => (
                    <li
                      key={i}
                      className="flex justify-between text-muted-foreground"
                    >
                      <span>{entry.status.replace(/_/g, " ")}</span>
                      <span>{new Date(entry.at).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-lg">
                Internal notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.internalNotes ? (
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">
                  {order.internalNotes}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No internal notes yet.
                </p>
              )}
              <form onSubmit={handleAddNote} className="flex gap-2">
                <Input
                  placeholder="Add a note..."
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  disabled={updating}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={updating || !noteInput.trim()}
                >
                  Add
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-lg">
                Customer communication log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Order confirmation and status emails are sent automatically. No
                manual messages yet.
              </p>
            </CardContent>
          </Card>

          {showRefundPanel && (
            <Card className="border-border border-amber-500/30">
              <CardHeader>
                <CardTitle className="font-heading text-lg">Refund</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {order.status === "refunded"
                    ? "This order has been refunded."
                    : "Return requested. Process return and issue refund when applicable."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="border-border sticky top-24">
            <CardHeader>
              <CardTitle className="font-heading text-lg">
                Payment details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold">
                  ${order.total.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment</span>
                <span>
                  {(order.paymentStatus ?? "paid").replace(/_/g, " ")}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-lg">
                Update status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {nextStatuses.length > 0 ? (
                <Select
                  value={order.status}
                  onValueChange={(v) =>
                    handleStatusChange(v as Order["status"])
                  }
                  disabled={updating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={order.status}>
                      {order.status.replace(/_/g, " ")} (current)
                    </SelectItem>
                    {nextStatuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No further status changes available.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-lg">
                Shipping tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="tracking">Tracking number</Label>
              <div className="flex gap-2">
                <Input
                  id="tracking"
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  placeholder="Enter tracking number"
                  disabled={updating}
                />
                <Button size="sm" onClick={handleSaveTracking} disabled={updating}>
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>

          {!showRefundPanel &&
            order.status !== "cancelled" &&
            order.status !== "delivered" && (
              <Card className="border-border">
                <CardContent className="pt-4">
                  <Button variant="outline" className="w-full" disabled>
                    Request refund (connect backend)
                  </Button>
                </CardContent>
              </Card>
            )}
        </div>
      </div>
    </div>
  );
}

