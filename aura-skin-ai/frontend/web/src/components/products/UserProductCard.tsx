"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageIcon, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useToastStore } from "@/store/toastStore";
import { useRouter } from "next/navigation";
import type { Product } from "@/types";

interface UserProductCardProps {
  product: Product;
  variant?: "default" | "compact";
}

export function UserProductCard({ product, variant = "default" }: UserProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const addToast = useToastStore((s) => s.addToast);
  const router = useRouter();
  const imageUrl = product.imageUrl?.trim();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem(product.id, 1);
    addToast(`${product.name} added to cart`);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(`/checkout?mode=direct&productId=${product.id}&qty=1`);
  };

  if (variant === "compact") {
    return (
      <Card className="overflow-hidden border-border flex flex-col h-full min-w-[220px] shrink-0 hover:shadow-[0_0_20px_rgba(229,190,181,0.2)] transition-shadow">
        <Link href={`/shop/${product.id}`}>
          <div className="relative w-full aspect-[4/3] flex-shrink-0 bg-muted/80 overflow-hidden">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={product.name}
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                <ImageIcon className="h-10 w-10 text-muted-foreground/60" aria-hidden />
              </div>
            )}
            {product.matchPercent != null && (
              <Badge className="absolute top-2 right-2 bg-accent/90 text-white">
                {product.matchPercent}% match
              </Badge>
            )}
          </div>
          <CardHeader className="font-heading py-3">
            <p className="text-xs text-muted-foreground">{product.brand ?? "AuraSkin"}</p>
            <h3 className="text-base font-semibold text-foreground line-clamp-2">{product.name}</h3>
            <p className="text-sm font-medium text-foreground">
              ${product.price?.toFixed(2) ?? "—"}
            </p>
          </CardHeader>
        </Link>
        <CardContent className="pt-0 flex flex-col gap-2">
          <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
          <div className="flex gap-2 mt-auto">
            <Button variant="outline" size="sm" className="flex-1" onClick={handleAddToCart}>
              <ShoppingCart className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <Link href={`/shop/${product.id}`}>View Product</Link>
            </Button>
            <Button size="sm" className="flex-1" onClick={handleBuyNow}>
              Buy Now
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-border flex flex-col h-full hover:shadow-[0_0_20px_rgba(229,190,181,0.2)] transition-shadow">
      <Link href={`/shop/${product.id}`}>
        <div className="relative w-full aspect-[4/3] flex-shrink-0 bg-muted/80 overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
              <ImageIcon className="h-10 w-10 text-muted-foreground/60" aria-hidden />
            </div>
          )}
          {product.matchPercent != null && (
            <Badge className="absolute top-2 right-2 bg-accent/90 text-white">
              {product.matchPercent}% match
            </Badge>
          )}
        </div>
        <CardHeader className="font-heading">
          <p className="text-xs text-muted-foreground">{product.brand ?? "AuraSkin"}</p>
          <h3 className="text-xl font-semibold text-foreground">{product.name}</h3>
          <div className="flex items-center gap-2">
            <p className="text-lg font-medium text-foreground">
              ${product.price?.toFixed(2) ?? "—"}
            </p>
            {product.rating != null && (
              <span className="text-xs text-muted-foreground">★ {product.rating}</span>
            )}
          </div>
        </CardHeader>
      </Link>
      <CardContent className="pt-0 flex flex-col flex-1">
        <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-2">{product.description}</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={handleAddToCart}>
            <ShoppingCart className="h-3.5 w-3.5 mr-1" />
            Add to Cart
          </Button>
          <Button size="sm" className="flex-1" onClick={handleBuyNow}>
            Buy Now
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/shop/${product.id}`}>View Details</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
