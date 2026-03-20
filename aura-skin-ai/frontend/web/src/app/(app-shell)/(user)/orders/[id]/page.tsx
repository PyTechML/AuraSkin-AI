"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useOrdersStore } from "@/store/ordersStore";
import type { Order } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageIcon, Package, Truck } from "lucide-react";

const TIMELINE_STEPS = [
  { key: "placed" as const, label: "Order Placed" },
  { key: "processing" as const, label: "Processing" },
  { key: "shipped" as const, label: "Shipped" },
  { key: "out_for_delivery" as const, label: "Out for Delivery" },
  { key: "delivered" as const, label: "Delivered" },
];

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const getOrderById = useOrdersStore((s) => s.getOrderById);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrderById(orderId).then(setOrder).finally(() => setLoading(false));
  }, [orderId, getOrderById]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-semibold">Order details</h1>
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/orders">Back to orders</Link>
        </Button>
        <p className="text-muted-foreground">Order not found.</p>
      </div>
    );
  }

  const stepIndex = TIMELINE_STEPS.findIndex((s) => s.key === order.status);
  const canCancel = order.status === "placed" || order.status === "processing";

  return (
    <div className="space-y-8">
      <Button variant="outline" size="sm" asChild>
        <Link href="/orders">Back to orders</Link>
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">
          Order #{order.id.replace("ord-", "")}
        </h1>
        <Badge
          variant={
            order.status === "delivered"
              ? "success"
              : order.status === "cancelled"
              ? "secondary"
              : "outline"
          }
        >
          {order.status.replace("_", " ")}
        </Badge>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border">
            <CardHeader>
              <h2 className="font-heading text-lg font-semibold">Order timeline</h2>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {TIMELINE_STEPS.map((step, i) => {
                  const isActive = i <= stepIndex;
                  const isCurrent = i === stepIndex;
                  return (
                    <div key={step.key} className="flex gap-4 pb-6 last:pb-0">
                      <div
                        className={`relative flex flex-col items-center ${
                          isActive ? "text-accent" : "text-muted-foreground"
                        }`}
                      >
                        <div
                          className={`h-8 w-8 rounded-full border-2 flex items-center justify-center ${
                            isActive
                              ? "border-accent bg-accent/20"
                              : "border-border bg-muted/40"
                          }`}
                        >
                          {isActive ? (
                            <span className="text-xs font-medium">✓</span>
                          ) : (
                            <span className="text-xs">{i + 1}</span>
                          )}
                        </div>
                        {i < TIMELINE_STEPS.length - 1 && (
                          <div
                            className={`absolute top-8 w-0.5 h-6 flex-1 ${
                              isActive ? "bg-accent/50" : "bg-border"
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex-1 pt-0.5">
                        <p className="font-medium">{step.label}</p>
                        {isCurrent && step.key === "shipped" && order.shipmentId && (
                          <p className="text-sm text-muted-foreground">
                            Shipment ID: {order.shipmentId}
                          </p>
                        )}
                        {isCurrent && order.deliveryEstimate && (
                          <p className="text-sm text-muted-foreground">
                            Est. delivery: {order.deliveryEstimate}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <h2 className="font-heading text-lg font-semibold">Items</h2>
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
        </div>

        <div>
          <Card className="border-border sticky top-24">
            <CardHeader>
              <h2 className="font-heading text-lg font-semibold">Summary</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Order date</span>
                <span>{order.createdAt}</span>
              </div>
              {order.shipmentId && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipment ID</span>
                  <span>{order.shipmentId}</span>
                </div>
              )}
              {order.deliveryEstimate && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Est. delivery</span>
                  <span>{order.deliveryEstimate}</span>
                </div>
              )}
              <div className="border-t border-border pt-3 flex justify-between font-semibold">
                <span>Total</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
              {canCancel && (
                <Button variant="outline" className="w-full mt-4" disabled>
                  Cancel order (UI only)
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
