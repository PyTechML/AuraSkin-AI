"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/store/cartStore";
import { getProductById } from "@/services/api";
import type { Product } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QuantitySelector } from "@/components/products/QuantitySelector";
import { ImageIcon, Trash2 } from "lucide-react";

const TAX_RATE = 0.08;
const SHIPPING_THRESHOLD = 50;
const SHIPPING_COST = 5.99;

export default function CartPage() {
  const items = useCartStore((s) => s.items ?? []);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [deliveryStr, setDeliveryStr] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      const map: Record<string, Product> = {};
      for (const item of items) {
        const p = await getProductById(item.productId);
        if (p) map[item.productId] = p;
      }
      setProducts(map);
      setLoading(false);
    };
    load();
  }, [items]);

  useEffect(() => {
    const estimate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    setDeliveryStr(
      estimate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    );
  }, []);

  const subtotal = items.reduce((sum, item) => {
    const p = products[item.productId];
    const price = p?.price ?? 0;
    return sum + price * item.quantity;
  }, 0);

  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + shipping + tax;

  if (items.length === 0 && !loading) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-semibold">Cart</h1>
        <Card className="border-border">
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground mb-6">Your cart is empty.</p>
            <Button asChild>
              <Link href="/shop">Browse products</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="font-heading text-2xl font-semibold">Cart</h1>
      <p className="text-muted-foreground">
        Review your items and proceed to checkout.
      </p>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const product = products[item.productId];
            if (!product) {
              return (
                <Card key={item.productId} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex gap-4 items-center">
                      <div className="w-20 h-20 shrink-0 rounded-lg bg-muted/40 animate-pulse" aria-hidden />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-4 w-32 rounded bg-muted/40 animate-pulse" aria-hidden />
                        <div className="h-3 w-20 rounded bg-muted/40 animate-pulse" aria-hidden />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            }
            const price = product.price ?? 0;
            const lineTotal = price * item.quantity;
            return (
              <Card key={item.productId} className="border-border">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 shrink-0 rounded-lg bg-muted/80 flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/60" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/shop/${product.id}`}
                        className="font-heading font-medium truncate block hover:text-accent"
                      >
                        {product.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        ${price.toFixed(2)} × {item.quantity}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <QuantitySelector
                          value={item.quantity}
                          onQuantityChange={(q) => updateQuantity(item.productId, q)}
                        />
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId)}
                          className="text-sm text-muted-foreground hover:text-destructive flex items-center gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="text-right font-medium">
                      ${lineTotal.toFixed(2)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
              {deliveryStr && (
                <p className="text-xs text-muted-foreground">
                  Estimated delivery: {deliveryStr}
                </p>
              )}
              <Button asChild className="w-full mt-4">
                <Link href="/checkout">Proceed to checkout</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
