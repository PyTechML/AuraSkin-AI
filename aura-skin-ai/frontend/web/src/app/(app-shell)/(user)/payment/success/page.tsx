"use client";

import { Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  CreditCard,
  Building2,
  Banknote,
  Package,
  Truck,
} from "lucide-react";

const METHOD_LABELS: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  card: {
    label: "Credit / Debit Card",
    icon: <CreditCard className="h-4 w-4 text-muted-foreground" />,
    description: "Payment processed securely via Stripe.",
  },
  bank_transfer: {
    label: "Bank Transfer",
    icon: <Building2 className="h-4 w-4 text-muted-foreground" />,
    description: "Payment processed through Stripe checkout.",
  },
  cod: {
    label: "Cash on Delivery",
    icon: <Banknote className="h-4 w-4 text-muted-foreground" />,
    description: "Payment will be collected when your order is delivered.",
  },
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const method = searchParams.get("method") ?? "";
  const orderId = searchParams.get("orderId");
  const type = searchParams.get("type");
  const isConsultation = type === "consultation";
  const isCod = method === "cod";
  const isCard = method === "card";
  const isBankTransfer = method === "bank_transfer";
  const isStripePayment = isCard || isBankTransfer;
  const clearCart = useCartStore((s) => s.clear);
  const didClear = useRef(false);

  useEffect(() => {
    if (!didClear.current) {
      didClear.current = true;
      clearCart();
    }
  }, [clearCart]);

  const methodInfo = METHOD_LABELS[method] ?? METHOD_LABELS.card;

  const heading = isConsultation
    ? "Payment Successful"
    : isCod
      ? "Order Placed"
      : "Payment Successful";

  const mainMessage = isConsultation
    ? "Your consultation has been successfully booked."
    : isCod
      ? "Your Cash on Delivery order has been placed!"
      : isCard
        ? "Your payment was successful! Your order has been placed."
        : isBankTransfer
          ? "Your bank transfer payment was successful! Your order has been placed."
          : "Thank you for your payment! Your order has been placed.";

  const subtext = isConsultation
    ? "The dermatologist will review your request and connect with you at the scheduled time."
    : methodInfo.description;

  const infoBlock = isConsultation
    ? "Consultation confirmed. Payment processed securely via Stripe."
    : methodInfo.label;

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">{heading}</h1>
      <Card className="border-border">
        <CardContent className="py-10 space-y-5 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-emerald-100 p-4 dark:bg-emerald-900/30">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-lg font-medium">{mainMessage}</p>
            <p className="text-muted-foreground">{subtext}</p>
          </div>

          {!isConsultation && orderId && (
            <div className="inline-flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-2 text-sm">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Order ID:</span>
              <span className="font-mono font-medium">
                {orderId.slice(0, 8)}
              </span>
            </div>
          )}

          {isStripePayment && (
            <div className="inline-flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-2 text-sm">
              {methodInfo.icon}
              <span className="text-muted-foreground">{isConsultation ? "Status:" : "Paid via:"}</span>
              <span className="font-medium">{infoBlock}</span>
            </div>
          )}

          {!isConsultation && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Truck className="h-4 w-4" />
              <span>Approvel with in 24hr.</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            {isConsultation ? (
              <>
                <Button variant="outline" asChild>
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" asChild>
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              </>
            )}
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
