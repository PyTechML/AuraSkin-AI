"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const MIN_QTY = 1;
const MAX_QTY = 99;

interface QuantitySelectorProps {
  value: number;
  onQuantityChange: (qty: number) => void;
  className?: string;
  min?: number;
  max?: number;
}

export function QuantitySelector({
  value,
  onQuantityChange,
  className,
  min = MIN_QTY,
  max = MAX_QTY,
}: QuantitySelectorProps) {
  const clamped = Math.max(min, Math.min(max, value));

  const setQuantity = useCallback(
    (next: number) => {
      const qty = Math.max(min, Math.min(max, Math.floor(next)));
      onQuantityChange(qty);
    },
    [min, max, onQuantityChange]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value, 10);
    if (Number.isNaN(parsed)) return;
    setQuantity(parsed);
  };

  return (
    <div className={cn("flex items-center gap-2", className)} role="group" aria-label="Quantity">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-10 w-10 shrink-0"
        onClick={() => setQuantity(clamped - 1)}
        disabled={clamped <= min}
        aria-label="Decrease quantity"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        type="number"
        min={min}
        max={max}
        value={clamped}
        onChange={handleInputChange}
        className="h-10 w-14 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        aria-label="Quantity"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-10 w-10 shrink-0"
        onClick={() => setQuantity(clamped + 1)}
        disabled={clamped >= max}
        aria-label="Increase quantity"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
