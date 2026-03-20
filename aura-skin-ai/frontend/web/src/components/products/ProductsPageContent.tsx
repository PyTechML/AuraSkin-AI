"use client";

import { motion } from "framer-motion";
import {
  StaggerChildren,
  StaggerItem,
  SectionReveal,
} from "@/components/landing/ScrollReveal";
import { ProductCard } from "./ProductCard";
import type { Product } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ProductsPageContentProps {
  products: Product[];
}

export function ProductsPageContent({ products }: ProductsPageContentProps) {
  const safeProducts = Array.isArray(products) ? products : [];
  return (
    <div className="bg-background text-foreground">
      {/* Section 1 — Hero */}
      <section className="relative min-h-[40vh] flex flex-col items-center justify-center px-4 py-20 overflow-hidden">
        <div className="relative z-10 w-full max-w-3xl mx-auto text-center">
          <motion.h1
            className="font-heading text-4xl md:text-5xl font-semibold tracking-tight text-foreground"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            AI-Curated Skincare
          </motion.h1>
          <motion.p
            className="mt-5 text-muted-foreground font-body text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7, ease: "easeOut" }}
          >
            Products recommended based on structured skin assessment.
          </motion.p>
        </div>
      </section>

      <div className="h-px bg-border/40" />

      {/* Section 2 — Product Grid */}
      <section className="py-24 px-4 bg-background">
        <div className="container max-w-5xl mx-auto">
          {safeProducts.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-12 text-center space-y-3">
                <p className="text-muted-foreground">
                  No products are available right now. Please check back soon.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/shop">Browse all products</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <StaggerChildren
              className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              stagger={0.12}
            >
              {safeProducts.map((product) => (
                <StaggerItem key={product.id}>
                  <ProductCard product={product} />
                </StaggerItem>
              ))}
            </StaggerChildren>
          )}
        </div>
      </section>

      <div className="h-px bg-border/40" />

      {/* Section 3 — Trust */}
      <section className="py-24 px-4 bg-background">
        <div className="container max-w-3xl mx-auto text-center">
          <SectionReveal variant="fadeOnly">
            <h2 className="font-heading text-3xl md:text-4xl font-semibold mb-6 text-foreground">
              AI-Recommended
            </h2>
            <p className="text-muted-foreground font-body text-lg leading-relaxed">
              Products are mapped to assessment insights.
            </p>
          </SectionReveal>
        </div>
      </section>
    </div>
  );
}
