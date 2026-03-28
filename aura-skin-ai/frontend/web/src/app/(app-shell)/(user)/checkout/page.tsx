"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { createCheckoutSession, createUpiPayment, createCodPayment, getProductById } from "@/services/api";
import { usePanelToast } from "@/components/panel/PanelToast";
import type { Product } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageIcon, CreditCard, MapPin, Wallet } from "lucide-react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { QRCodeCanvas } from "qrcode.react";
import { dispatchPanelSync } from "@/lib/panelRealtimeSync";

const STEPS = ["Address", "Payment", "Review"] as const;
const TAX_RATE = 0.08;
const SHIPPING = 5.99;

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const directProductId = searchParams.get("productId");
  const directQty = parseInt(searchParams.get("qty") ?? "1", 10);

  const items = useCartStore((s) => s.items ?? []);
  const user = useAuthStore((s) => s.user);
  const { addToast } = usePanelToast();

  const [step, setStep] = useState(1);
  const [address, setAddress] = useState({
    line1: "",
    line2: "",
    city: "",
    state: "",
    zip: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "netbanking" | "wallet" | "cod">("card");
  const [checkoutItems, setCheckoutItems] = useState<{ product: Product; quantity: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [upiPayment, setUpiPayment] = useState<{
    upi_url: string;
    payment_id: string;
    amount: number;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoadError(null);
      try {
        if (mode === "direct" && directProductId) {
          const product = await getProductById(directProductId);
          if (product) {
            setCheckoutItems([
              { product, quantity: Math.max(1, Math.min(99, directQty)) },
            ]);
          }
        } else {
          if (items.length === 0) {
            setCheckoutItems([]);
            setLoading(false);
            return;
          }
          const list: { product: Product; quantity: number }[] = [];
          for (const item of items) {
            const product = await getProductById(item.productId);
            if (product) list.push({ product, quantity: item.quantity });
          }
          setCheckoutItems(list);
        }
      } catch {
        setLoadError("Unable to load checkout. Please try again.");
        setCheckoutItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [mode, directProductId, directQty, items]);

  useEffect(() => {
    if (!loading && mode !== "direct" && items.length === 0 && checkoutItems.length === 0 && !loadError) {
      router.replace("/cart");
    }
  }, [loading, mode, items.length, checkoutItems.length, loadError, router]);

  const subtotal = checkoutItems.reduce(
    (sum, { product, quantity }) => sum + (product.price ?? 0) * quantity,
    0
  );
  const tax = subtotal * TAX_RATE;
  const shipping = subtotal >= 50 ? 0 : SHIPPING;
  const total = subtotal + tax + shipping;

  const handleSubmit = async () => {
    if (!user) return;
    if (checkoutItems.length === 0) return;
    setSubmitting(true);
    try {
      const itemsPayload = checkoutItems.map(({ product, quantity }) => ({
        product_id: product.id,
        quantity,
        ...(product.storeId ? { store_id: product.storeId } : {}),
      }));

      if (paymentMethod === "upi") {
        const result = await createUpiPayment({
          items: itemsPayload,
          customer_name: user.name?.trim() || undefined,
        });
        if (result?.upi_url && result?.payment_id) {
          setUpiPayment(result);
          addToast(`UPI payment initiated — ₹${result.amount}`, "success");
          return;
        }
        addToast("Unable to initiate UPI payment", "error");
        return;
      }

      if (paymentMethod === "cod") {
        const shippingStr = [address.line1, address.line2, address.city, address.state, address.zip]
          .filter(Boolean)
          .join(", ");
        const result = await createCodPayment({
          items: itemsPayload,
          shipping_address: shippingStr,
          customer_name: user.name?.trim() || undefined,
        });
        if (result?.order_id) {
          dispatchPanelSync("orders");
          dispatchPanelSync("notifications");
          dispatchPanelSync("assigned-users");
          addToast("Order placed successfully! Pay on delivery.", "success");
          router.push("/orders");
          return;
        }
        addToast("Unable to place COD order", "error");
        return;
      }

      // Card / Netbanking / Wallet → Stripe checkout
      const { checkout_url: checkoutUrl } = await createCheckoutSession({
        items: itemsPayload,
        customer_name: user.name?.trim() || undefined,
      });
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }
      addToast("Checkout did not return a payment link. Check that Stripe is configured on the server.", "error");
    } catch (err) {
      const msg =
        err instanceof Error && err.message.trim()
          ? err.message
          : "Unable to start checkout";
      addToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-semibold">Checkout</h1>
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-6">Please log in to checkout.</p>
            <Button asChild>
              <Link href={`/login?redirect=${encodeURIComponent("/checkout")}`}>
                Log in
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-semibold">Checkout</h1>
        <PageSkeleton />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-semibold">Checkout</h1>
        <Card className="border-border">
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-muted-foreground">{loadError}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => window.location.reload()}>Try again</Button>
              <Button variant="outline" asChild>
                <Link href="/cart">Back to cart</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (checkoutItems.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-semibold">Checkout</h1>
        <Card className="border-border">
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-muted-foreground">No items to checkout.</p>
            <Button asChild>
              <Link href="/cart">Back to cart</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="font-heading text-2xl font-semibold">Checkout</h1>

      <div className="flex gap-2">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`flex items-center gap-2 ${
              step > i + 1 ? "text-green-600" : step === i + 1 ? "text-foreground font-medium" : "text-muted-foreground"
            }`}
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm">
              {step > i + 1 ? "✓" : i + 1}
            </span>
            <span>{label}</span>
            {i < STEPS.length - 1 && (
              <span className="text-muted-foreground/50">→</span>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {step === 1 && (
            <Card className="border-border">
              <CardHeader>
                <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shipping address
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="line1">Address line 1</Label>
                  <Input
                    id="line1"
                    value={address.line1}
                    onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))}
                    placeholder="Street address"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="line2">Address line 2</Label>
                  <Input
                    id="line2"
                    value={address.line2}
                    onChange={(e) => setAddress((a) => ({ ...a, line2: e.target.value }))}
                    placeholder="Apt, suite, etc."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={address.city}
                      onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={address.state}
                      onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="zip">ZIP code</Label>
                  <Input
                    id="zip"
                    value={address.zip}
                    onChange={(e) => setAddress((a) => ({ ...a, zip: e.target.value }))}
                  />
                </div>
                <Button onClick={() => setStep(2)}>
                  Continue to payment
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card className="border-border">
              <CardHeader>
                <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment method
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {(["upi", "card", "netbanking", "wallet", "cod"] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`flex items-center gap-2 rounded-xl border p-4 text-left transition-colors ${
                        paymentMethod === method
                          ? "border-accent bg-accent/10"
                          : "border-border hover:bg-muted/40"
                      }`}
                    >
                      <Wallet className="h-5 w-5" />
                      <span className="capitalize">{method === "cod" ? "Cash on Delivery" : method.replace("_", " ")}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  After review, you will complete your payment via a secure provider.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button onClick={() => setStep(3)}>
                    Continue to review
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card className="border-border">
              <CardHeader>
                <h2 className="font-heading text-lg font-semibold">Review order</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {checkoutItems.map(({ product, quantity }) => (
                    <div key={product.id} className="flex gap-4">
                      <div className="w-16 h-16 shrink-0 rounded-lg bg-muted/80 flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground/60" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ${(product.price ?? 0).toFixed(2)} × {quantity}
                        </p>
                      </div>
                      <p className="font-medium">
                        ${((product.price ?? 0) * quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button onClick={handleSubmit} disabled={submitting || (paymentMethod === "upi" && !!upiPayment)}>
                    {paymentMethod === "upi" && upiPayment ? "UPI initiated" : submitting ? "Starting checkout…" : "Place order"}
                  </Button>
                </div>

                {paymentMethod === "upi" && upiPayment && (
                  <div className="rounded-xl border border-border/60 bg-muted/10 p-4 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Scan this QR in your UPI app to pay. Payment reference:{" "}
                      <span className="font-mono text-xs">{upiPayment.payment_id}</span>
                    </p>
                    <div className="flex justify-center">
                      <div className="bg-white p-3 rounded-lg border">
                        <QRCodeCanvas value={upiPayment.upi_url} size={220} includeMargin />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button asChild className="flex-1">
                        <a href={upiPayment.upi_url}>Open UPI app</a>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(upiPayment.upi_url);
                            addToast("UPI link copied", "success");
                          } catch {
                            addToast("Unable to copy UPI link", "error");
                          }
                        }}
                      >
                        Copy UPI link
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Card className="border-border sticky top-24">
            <CardHeader>
              <h2 className="font-heading text-lg font-semibold">Order summary</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>{shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between font-semibold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CheckoutContent />
    </Suspense>
  );
}
