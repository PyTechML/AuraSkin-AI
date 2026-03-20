"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ArticleCardProps = {
  title: string;
  summary: string;
  category: "AI" | "Routine" | "Skin Science" | string;
  href?: string;
  className?: string;
};

export function ArticleCard({
  title,
  summary,
  category,
  href = "#",
  className,
}: ArticleCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={className}
    >
      <Card className="h-full flex flex-col overflow-hidden rounded-3xl">
        <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-glass-1/40 via-glass-2/30 to-background/10 border-b border-border/40" />
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="inline-flex items-center rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-label uppercase tracking-[0.18em] text-muted-foreground">
              {category}
            </span>
          </div>
          <CardTitle className="font-heading text-xl font-semibold leading-snug">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 flex-1 flex flex-col">
          <p className="text-sm text-muted-foreground font-body leading-relaxed mb-4 line-clamp-4">
            {summary}
          </p>
          <div className="mt-auto">
            <Button
              asChild
              variant="link"
              className={cn("px-0 text-sm font-label")}
            >
              <a href={href}>Read more</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

