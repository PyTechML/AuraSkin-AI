"use client";

import Image from "next/image";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ImageIcon } from "lucide-react";

export interface ServiceCardProps {
  title: string;
  description: string;
  imageSrc?: string;
  placeholderLabel?: string;
  alt?: string;
}

export function ServiceCard({
  title,
  description,
  imageSrc,
  placeholderLabel,
  alt,
}: ServiceCardProps) {
  return (
    <Card className="overflow-hidden border-border flex flex-col h-full">
      <div className="relative w-full aspect-[4/3] flex-shrink-0 bg-muted/80 overflow-hidden">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={alt ?? title}
            fill
            className="object-cover object-center"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
            <ImageIcon className="h-10 w-10 text-muted-foreground/60" aria-hidden />
            {placeholderLabel && (
              <span className="text-xs font-label text-muted-foreground/80 max-w-[90%]">
                {placeholderLabel}
              </span>
            )}
          </div>
        )}
      </div>
      <CardHeader className="flex-1">
        <CardTitle className="font-heading text-xl font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground font-body leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
