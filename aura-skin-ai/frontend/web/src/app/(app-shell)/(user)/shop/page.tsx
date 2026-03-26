"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProducts, getAiRecommendedProducts } from "@/services/api";
import type { Product } from "@/types";
import type { ProductFilters, ProductSort } from "@/services/api";
import { UserProductCard } from "@/components/products/UserProductCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import { PANEL_LIVE_POLL_INTERVAL_MS } from "@/lib/panelPolling";

const SKIN_TYPES = ["Dry", "Oily", "Combination", "Normal", "Sensitive"];
const CONCERNS = ["Acne", "Dryness", "Hyperpigmentation", "Fine lines", "Sensitivity", "Dullness"];
const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "popular", label: "Popular" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price Low-High" },
  { value: "price_desc", label: "Price High-Low" },
];

export default function ShopPage() {
  const [aiProducts, setAiProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);
  const [filters, setFilters] = useState<ProductFilters>({});
  const [sort, setSort] = useState<ProductSort>("popular");
  const [page, setPage] = useState(1);
  const perPage = 12;

  useEffect(() => {
    let alive = true;
    let interval: ReturnType<typeof setInterval> | undefined;

    const load = (isInitial = false) => {
      if (isInitial) setAiLoading(true);
      getAiRecommendedProducts()
        .then((products) => {
          if (alive) setAiProducts(Array.isArray(products) ? products : []);
        })
        .catch(() => {
          // Keep last known recommendations to avoid flicker on transient failures.
        })
        .finally(() => {
          if (alive) setAiLoading(false);
        });
    };

    load(true);
    interval = setInterval(() => load(false), PANEL_LIVE_POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        load();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      alive = false;
      if (interval) clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getProducts(filters, sort)
      .then((products) => {
        if (alive) setAllProducts(Array.isArray(products) ? products : []);
      })
      .catch(() => {
        if (alive) setAllProducts([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
  }, [filters, sort]);

  const safeAllProducts = Array.isArray(allProducts) ? allProducts : [];
  const safeAiProducts = Array.isArray(aiProducts) ? aiProducts : [];

  const paginatedProducts = safeAllProducts.slice(
    (page - 1) * perPage,
    page * perPage
  );
  const totalPages = Math.ceil(safeAllProducts.length / perPage);

  return (
    <div className="space-y-8">
      <h1 className="font-heading text-2xl font-semibold">Products</h1>
      <p className="text-muted-foreground">
        AI-personalized recommendations and the full marketplace.
      </p>

      {/* Section 1 — AI Recommended */}
      <section>
        <h2 className="font-heading text-lg font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          AI Recommended
        </h2>
        {aiLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="min-w-[220px] h-72 rounded-xl border border-border/60 bg-muted/40 animate-pulse"
              />
            ))}
          </div>
        ) : safeAiProducts.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
            {safeAiProducts.map((product) => (
              <UserProductCard key={product.id} product={product} variant="compact" />
            ))}
          </div>
        ) : (
          <Card className="border-border">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground mb-4">
                Complete assessment to unlock personalized product matches.
              </p>
              <Button asChild>
                <Link href="/start-assessment">Start Assessment</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Section 2 — All Products Marketplace */}
      <section>
        <h2 className="font-heading text-lg font-semibold mb-4">All Products</h2>

        {/* Filter bar */}
        <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-background/95 backdrop-blur border-b border-border/60 mb-6 flex flex-wrap gap-4">
          <Select
            value={filters.skinType ?? "all"}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, skinType: v === "all" ? undefined : v }))
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Skin Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {SKIN_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.concern ?? "all"}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, concern: v === "all" ? undefined : v }))
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Concern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All concerns</SelectItem>
              {CONCERNS.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as ProductSort)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-80 rounded-xl border border-border/60 bg-muted/40 animate-pulse"
              />
            ))}
          </div>
        ) : paginatedProducts.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No products match your filters.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedProducts.map((product) => (
                <UserProductCard key={product.id} product={product} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
