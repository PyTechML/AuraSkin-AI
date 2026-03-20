"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { Button } from "@/components/ui/button";

interface AddToCartButtonProps {
  productId: string;
  productName?: string;
  quantity?: number;
  /** Override redirect path after login (e.g. /products/1 for user panel) */
  redirectPath?: string;
}

function isSafeRedirect(path: string): boolean {
  if (!path || typeof path !== "string") return false;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/")) return false;
  if (trimmed.startsWith("//") || trimmed.includes(":")) return false;
  return true;
}

export function AddToCartButton({ productId, productName, quantity, redirectPath: redirectPathProp }: AddToCartButtonProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);

  const redirectPath = redirectPathProp ?? `/product/${productId}`;
  const loginHref = isSafeRedirect(redirectPath)
    ? `/login?redirect=${encodeURIComponent(redirectPath)}`
    : "/login";

  if (!isAuthenticated) {
    return (
      <Button asChild variant="default" size="lg">
        <Link href={loginHref}>Login to add to cart</Link>
      </Button>
    );
  }

  const handleAdd = () => {
    addItem(productId, quantity ?? 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <Button
      variant="default"
      size="lg"
      onClick={handleAdd}
      disabled={added}
      aria-pressed={added}
    >
      {added ? "Added to cart" : "Add to Cart"}
    </Button>
  );
}
