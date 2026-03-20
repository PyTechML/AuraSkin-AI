"use client";

import { useState } from "react";
import Link from "next/link";
import { AddToCartButton } from "@/components/products/AddToCartButton";
import { QuantitySelector } from "@/components/products/QuantitySelector";
import { Button } from "@/components/ui/button";

interface ProductDetailsActionsProps {
  productId: string;
  productName: string;
}

export function ProductDetailsActions({ productId, productName }: ProductDetailsActionsProps) {
  const [quantity, setQuantity] = useState(1);

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
        />
        <Button variant="outline" size="lg" asChild>
          <Link href="/products">Back to products</Link>
        </Button>
      </div>
    </div>
  );
}
