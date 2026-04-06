"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import {
  createCheckoutSession,
  createCodPayment,
  getPaymentMethods,
  getProductById,
  type PaymentMethodsResponse,
} from "@/services/api";
import { usePanelToast } from "@/components/panel/PanelToast";
import type { Product } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Banknote,
  Building2,
  CheckCircle2,
  CreditCard,
  ImageIcon,
  MapPin,
  Package,
} from "lucide-react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

const STEPS = ["Address", "Payment", "Review"] as const;
type PaymentMethod = "card" | "bank_transfer" | "cod";

const TAX_RATE = 0.08;
const SHIPPING_FEE = 5.99;
const FREE_SHIPPING_THRESHOLD = 50;

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const directProductId = searchParams.get("productId");
  const directQty = parseInt(searchParams.get("qty") ?? "1", 10);

  const items = useCartStore((s) => s.items ?? []);
  const clearCart = useCartStore((s) => s.clear);
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
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [availableMethods, setAvailableMethods] = useState<PaymentMethodsResponse | null>(null);
  const [paymentMethodsError, setPaymentMethodsError] = useState<string | null>(null);
  const [checkoutItems, setCheckoutItems] = useState<
    { product: Product; quantity: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadPaymentMethods = useCallback(async () => {
    try {
      setPaymentMethodsError(null);
      const methods = await getPaymentMethods();
      setAvailableMethods(methods);
    } catch (err) {
      const msg =
        err instanceof Error && err.message.trim()
          ? err.message
          : "Unable to load payment methods right now.";
      setPaymentMethodsError(msg);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoadError(null);
      try {
        await loadPaymentMethods();

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
  }, [mode, directProductId, directQty, items, loadPaymentMethods]);

  useEffect(() => {
    if (
      !loading &&
      mode !== "direct" &&
      items.length === 0 &&
      checkoutItems.length === 0 &&
      !loadError
    ) {
      router.replace("/cart");
    }
  }, [loading, mode, items.length, checkoutItems.length, loadError, router]);

  useEffect(() => {
    if (!selectedMethod || !availableMethods) return;
    if (selectedMethod === "card" && !availableMethods.card) {
      setSelectedMethod(null);
    }
    if (selectedMethod === "bank_transfer" && !availableMethods.bank_transfer) {
      setSelectedMethod(null);
    }
    if (selectedMethod === "cod" && !availableMethods.cod) {
      setSelectedMethod(null);
    }
  }, [selectedMethod, availableMethods]);

  const subtotal = checkoutItems.reduce(
    (sum, { product, quantity }) => sum + (product.price ?? 0) * quantity,
    0
  );
  const tax = subtotal * TAX_RATE;
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = subtotal + tax + shipping;

  const fullAddress = [address.line1, address.line2, address.city, address.state, address.zip]
    .filter(Boolean)
    .join(", ");

  const canProceedFromAddress =
    address.line1.trim().length > 0 &&
    address.city.trim().length > 0 &&
    address.state.trim().length > 0 &&
    address.zip.trim().length > 0;

  const buildItemsPayload = useCallback(
    () =>
      checkoutItems.map(({ product, quantity }) => ({
        product_id: product.id,
        quantity,
        ...(product.storeId ? { store_id: product.storeId } : {}),
      })),
    [checkoutItems]
  );

  const handlePlaceOrder = async () => {
    if (!user || !selectedMethod || checkoutItems.length === 0) return;
    setSubmitting(true);

    try {
      const itemsPayload = buildItemsPayload();
      const customerName = user.name?.trim() || undefined;

      if (selectedMethod === "card" || selectedMethod === "bank_transfer") {
        const { checkout_url: checkoutUrl } = await createCheckoutSession({
          items: itemsPayload,
          customer_name: customerName,
          shipping_address: fullAddress,
          payment_method: selectedMethod,
        });
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
          return;
        }
        addToast(
          "Could not start Stripe checkout. Please try again or use Cash on Delivery.",
          "error"
        );
      } else {
        const { order_id: orderId } = await createCodPayment({
          items: itemsPayload,
          shipping_address: fullAddress,
          customer_name: customerName,
        });
        clearCart();
        router.push(
          `/payment/success?method=cod&orderId=${encodeURIComponent(orderId)}`
        );
      }
    } catch (err) {
      const msg =
        err instanceof Error && err.message.trim()
          ? err.message
          : "Unable to place order. Please try again.";
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
            <p className="text-muted-foreground mb-6">
              Please log in to checkout.
            </p>
            <Button asChild>
              <Link
                href={`/login?redirect=${encodeURIComponent("/checkout")}`}
              >
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
              <Button onClick={() => window.location.reload()}>
                Try again
              </Button>
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

  const methodLabel: Record<PaymentMethod, string> = {
    card: "Credit / Debit Card",
    bank_transfer: "Bank Transfer",
    cod: "Cash on Delivery",
  };
  const showBankTransferAsSelectable = availableMethods?.bank_transfer === true;
  const bankTransferDetails = availableMethods?.details?.bank_transfer;

  return (
    <div className="space-y-8">
      <h1 className="font-heading text-2xl font-semibold">Checkout</h1>

      {/* Step indicators */}
      <div className="flex gap-2 flex-wrap">
        {STEPS.map((label, i) => {
          const stepNum = i + 1;
          const done = step > stepNum;
          const active = step === stepNum;
          return (
            <div
              key={label}
              className={`flex items-center gap-2 ${
                done
                  ? "text-green-600"
                  : active
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
              }`}
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm">
                {done ? <CheckCircle2 className="h-4 w-4" /> : stepNum}
              </span>
              <span>{label}</span>
              {i < STEPS.length - 1 && (
                <span className="text-muted-foreground/50 mx-1">&rarr;</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content area */}
        <div className="lg:col-span-2 space-y-6">
          {/* STEP 1: Shipping Address */}
          {step === 1 && (
            <Card className="border-border">
              <CardHeader>
                <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shipping Address
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="line1">Address line 1 *</Label>
                  <Input
                    id="line1"
                    value={address.line1}
                    onChange={(e) =>
                      setAddress((a) => ({ ...a, line1: e.target.value }))
                    }
                    placeholder="Street address"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="line2">Address line 2</Label>
                  <Input
                    id="line2"
                    value={address.line2}
                    onChange={(e) =>
                      setAddress((a) => ({ ...a, line2: e.target.value }))
                    }
                    placeholder="Apt, suite, etc."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={address.city}
                      onChange={(e) =>
                        setAddress((a) => ({ ...a, city: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      value={address.state}
                      onChange={(e) =>
                        setAddress((a) => ({ ...a, state: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="zip">ZIP code *</Label>
                  <Input
                    id="zip"
                    value={address.zip}
                    onChange={(e) =>
                      setAddress((a) => ({ ...a, zip: e.target.value }))
                    }
                  />
                </div>
                <Button
                  onClick={() => setStep(2)}
                  disabled={!canProceedFromAddress}
                >
                  Continue to payment
                </Button>
              </CardContent>
            </Card>
          )}

          {/* STEP 2: Payment Method */}
          {step === 2 && (
            <Card className="border-border">
              <CardHeader>
                <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Choose Payment Method
                </h2>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Card option */}
                <PaymentMethodOption
                  method="card"
                  label="Credit / Debit Card"
                  description="Pay securely via Stripe. Supports Visa, Mastercard, and more."
                  icon={<CreditCard className="h-6 w-6" />}
                  available={availableMethods?.card ?? false}
                  unavailableReason={availableMethods?.details?.card?.reason}
                  unavailableAction={availableMethods?.details?.card?.action}
                  selected={selectedMethod === "card"}
                  onSelect={() => setSelectedMethod("card")}
                />

                {/* Bank Transfer option */}
                {showBankTransferAsSelectable ? (
                  <PaymentMethodOption
                    method="bank_transfer"
                    label="Bank Transfer"
                    description="Pay via bank transfer through Stripe's secure payment page."
                    icon={<Building2 className="h-6 w-6" />}
                    available
                    unavailableReason={bankTransferDetails?.reason}
                    unavailableAction={bankTransferDetails?.action}
                    selected={selectedMethod === "bank_transfer"}
                    onSelect={() => setSelectedMethod("bank_transfer")}
                  />
                ) : (
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      Bank Transfer (Coming soon)
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {bankTransferDetails?.reason ??
                        "Bank transfer is currently unavailable in this environment."}
                      {bankTransferDetails?.action
                        ? ` ${bankTransferDetails.action}`
                        : ""}
                    </p>
                  </div>
                )}

                {/* COD option */}
                <PaymentMethodOption
                  method="cod"
                  label="Cash on Delivery"
                  description="Pay when your order is delivered to your doorstep."
                  icon={<Banknote className="h-6 w-6" />}
                  available={availableMethods?.cod ?? true}
                  unavailableReason={availableMethods?.details?.cod?.reason}
                  unavailableAction={availableMethods?.details?.cod?.action}
                  selected={selectedMethod === "cod"}
                  onSelect={() => setSelectedMethod("cod")}
                />

                {paymentMethodsError && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <p>{paymentMethodsError}</p>
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 mt-1 text-amber-900"
                      onClick={loadPaymentMethods}
                    >
                      Retry payment methods
                    </Button>
                  </div>
                )}

                {availableMethods && !availableMethods.card && !availableMethods.bank_transfer && (
                  <p className="text-xs text-amber-600 text-center pt-1">
                    Online payment is temporarily unavailable. Please use Cash on Delivery.
                  </p>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!selectedMethod}
                  >
                    Continue to review
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 3: Review and Place Order */}
          {step === 3 && (
            <Card className="border-border">
              <CardHeader>
                <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Review Your Order
                </h2>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Shipping summary */}
                <div className="rounded-lg border border-border/60 p-4 space-y-1">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Shipping to
                  </p>
                  <p className="text-sm text-muted-foreground">{fullAddress}</p>
                </div>

                {/* Payment method summary */}
                <div className="rounded-lg border border-border/60 p-4 space-y-1">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> Payment method
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedMethod ? methodLabel[selectedMethod] : "—"}
                  </p>
                  {(selectedMethod === "card" ||
                    selectedMethod === "bank_transfer") && (
                    <p className="text-xs text-muted-foreground/70">
                      You will be redirected to Stripe&apos;s secure payment page.
                    </p>
                  )}
                  {selectedMethod === "cod" && (
                    <p className="text-xs text-muted-foreground/70">
                      Payment will be collected upon delivery.
                    </p>
                  )}
                </div>

                {/* Items list */}
                <div className="space-y-3">
                  {checkoutItems.map(({ product, quantity }) => (
                    <div key={product.id} className="flex gap-4">
                      <div className="w-16 h-16 shrink-0 rounded-lg bg-muted/80 flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground/60" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ${(product.price ?? 0).toFixed(2)} x {quantity}
                        </p>
                      </div>
                      <p className="font-medium">
                        ${((product.price ?? 0) * quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button
                    onClick={handlePlaceOrder}
                    disabled={submitting}
                    aria-busy={submitting}
                  >
                    {submitting
                      ? "Placing order..."
                      : selectedMethod === "cod"
                        ? "Place COD Order"
                        : "Proceed to Stripe Payment"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order summary sidebar */}
        <div>
          <Card className="border-border sticky top-24">
            <CardHeader>
              <h2 className="font-heading text-lg font-semibold">
                Order Summary
              </h2>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax (8%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>
                  {shipping === 0 ? (
                    <span className="text-emerald-600">Free</span>
                  ) : (
                    `$${shipping.toFixed(2)}`
                  )}
                </span>
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

function PaymentMethodOption({
  label,
  description,
  icon,
  available,
  unavailableReason,
  unavailableAction,
  selected,
  onSelect,
}: {
  method: PaymentMethod;
  label: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
  unavailableReason?: string;
  unavailableAction?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!available}
      onClick={onSelect}
      className={`w-full text-left rounded-lg border-2 p-4 transition-colors ${
        !available
          ? "border-border/40 bg-muted/30 opacity-60 cursor-not-allowed"
          : selected
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/40 cursor-pointer"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 ${
            !available
              ? "text-muted-foreground/40"
              : selected
                ? "text-primary"
                : "text-muted-foreground"
          }`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
          {!available && (
            <p className="text-xs text-destructive mt-1">
              {unavailableReason || "Currently unavailable"}
              {unavailableAction ? ` ${unavailableAction}` : ""}
            </p>
          )}
        </div>
        <div className="mt-1">
          <div
            className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
              selected
                ? "border-primary bg-primary"
                : "border-muted-foreground/30"
            }`}
          >
            {selected && (
              <div className="h-2 w-2 rounded-full bg-primary-foreground" />
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CheckoutContent />
    </Suspense>
  );
}
