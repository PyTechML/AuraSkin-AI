"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AddToCartButton } from "@/components/products/AddToCartButton";
import { QuantitySelector } from "@/components/products/QuantitySelector";
import { Button } from "@/components/ui/button";

interface UserProductDetailsActionsProps {
  productId: string;
  productName: string;
}

export function UserProductDetailsActions({
  productId,
  productName,
}: UserProductDetailsActionsProps) {
  const [quantity, setQuantity] = useState(1);
  const router = useRouter();

  const handleBuyNow = () => {
    router.push(`/checkout?mode=direct&productId=${productId}&qty=${quantity}`);
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-label text-muted-foreground">Quantity</span>
        <QuantitySelector value={quantity} onQuantityChange={setQuantity} />
      </div>
      <div className="flex flex-col gap-2 sm:pt-7">
        <AddToCartButton
          productId={productId}
          productName={productName}
          quantity={quantity}
          redirectPath={`/shop/${productId}`}
        />
        <Button size="lg" onClick={handleBuyNow}>
          Buy Now
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link href="/shop">Back to products</Link>
        </Button>
      </div>
    </div>
  );
}
