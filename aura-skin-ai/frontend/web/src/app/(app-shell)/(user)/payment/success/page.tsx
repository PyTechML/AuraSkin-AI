"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Package, Truck } from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const method = searchParams.get("method");
  const orderId = searchParams.get("orderId");
  const isCod = method === "cod";

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">
        {isCod ? "Order Placed" : "Payment Successful"}
      </h1>
      <Card className="border-border">
        <CardContent className="py-10 space-y-5 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-emerald-100 p-4 dark:bg-emerald-900/30">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
          </div>

          {isCod ? (
            <>
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  Your Cash on Delivery order has been placed!
                </p>
                <p className="text-muted-foreground">
                  Payment will be collected when your order is delivered.
                </p>
              </div>
              {orderId && (
                <div className="inline-flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-2 text-sm">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Order ID:</span>
                  <span className="font-mono font-medium">
                    {orderId.slice(0, 8)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Truck className="h-4 w-4" />
                <span>Estimated delivery: 5-7 business days</span>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-lg font-medium">Thank you for your payment!</p>
              <p className="text-muted-foreground">
                Your order is being processed and will appear in your orders list
                shortly.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button asChild>
              <Link href="/orders">View Orders</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/shop">Continue Shopping</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <h1 className="font-heading text-2xl font-semibold">
            Processing...
          </h1>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
