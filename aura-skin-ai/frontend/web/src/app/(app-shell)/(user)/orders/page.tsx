"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useOrdersStore } from "@/store/ordersStore";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Truck } from "lucide-react";

export default function OrdersPage() {
  const user = useAuthStore((s) => s.user);
  const { orders, loading, fetchError, fetchOrders } = useOrdersStore();

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-semibold">Orders</h1>
        <p className="text-muted-foreground">Please log in to view your orders.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="font-heading text-2xl font-semibold">Orders</h1>
      <p className="text-muted-foreground">
        Track your orders and delivery status.
      </p>

      {fetchError ? (
        <Card className="border-border">
          <CardContent className="py-6 text-center space-y-3">
            <p className="text-muted-foreground">{fetchError}</p>
            <Button variant="outline" size="sm" onClick={() => fetchOrders()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 rounded-xl border border-border/60 bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-16 text-center">
            <Package className="h-12 w-12 text-muted-foreground/60 mx-auto mb-4" />
            <p className="text-muted-foreground mb-6">You haven&apos;t placed any orders yet.</p>
            <Button asChild>
              <Link href="/shop">Browse products</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="border-border">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="font-medium">Order #{order.id.replace("ord-", "")}</p>
                    <p className="text-sm text-muted-foreground">{order.createdAt}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {order.items.length} item{order.items.length !== 1 ? "s" : ""} · ${order.total.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
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
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/orders/${order.id}`}>
                        <Truck className="h-4 w-4 mr-1" />
                        Track
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
