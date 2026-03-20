import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageIcon } from "lucide-react";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Card className="overflow-hidden border-border flex flex-col h-full">
      <div
        className="relative w-full aspect-[4/3] flex-shrink-0 bg-muted/80 overflow-hidden"
        aria-hidden
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
          <ImageIcon className="h-10 w-10 text-muted-foreground/60" aria-hidden />
          <span className="text-xs font-label text-muted-foreground/80 max-w-[90%]">
            Image placeholder
          </span>
        </div>
      </div>
      <CardHeader className="font-heading">
        <h3 className="text-xl font-semibold text-foreground">{product.name}</h3>
      </CardHeader>
      <CardContent className="pt-0 flex flex-col flex-1">
        <p className="text-sm text-muted-foreground mb-4 flex-1">{product.description}</p>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/product/${product.id}`}>View Details</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
