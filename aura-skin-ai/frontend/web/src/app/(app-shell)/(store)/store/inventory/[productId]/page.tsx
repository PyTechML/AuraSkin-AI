"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  getPartnerProductById,
  updatePartnerProduct,
  submitProductForReview,
  archiveProduct,
} from "@/services/apiPartner";
import { useAuth } from "@/providers/AuthProvider";
import type { PartnerProduct } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ImageIcon,
  BarChart2,
  Send,
  Archive,
} from "lucide-react";

export default function StoreEditProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.productId as string;
  const { session } = useAuth();
  const partnerId = session?.user?.id ?? "";
  const [product, setProduct] = useState<PartnerProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!partnerId || !productId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getPartnerProductById(productId, partnerId)
      .then((p) => {
        setProduct(p);
        if (p) {
          setPrice(String(p.price ?? ""));
          setStock(String(p.stock ?? ""));
          setDescription(p.description ?? p.fullDescription ?? "");
          setVisibility(p.visibility ?? true);
        }
      })
      .catch(() => setError("Failed to load product."))
      .finally(() => setLoading(false));
  }, [partnerId, productId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !partnerId) return;
    setSaving(true);
    try {
      const updated = await updatePartnerProduct(productId, partnerId, {
        price: price ? parseFloat(price) : undefined,
        stock: stock ? parseInt(stock, 10) : undefined,
        description: description || undefined,
        visibility,
      });
      if (updated) setProduct(updated);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const status = product?.approvalStatus ?? "LIVE";
  const canSubmitForReview = status === "DRAFT" || status === "REJECTED";

  const handleSubmitForReview = async () => {
    if (!productId || !partnerId) return;
    setActionLoading(true);
    try {
      const updated = await submitProductForReview(productId, partnerId);
      if (updated) setProduct(updated);
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!productId || !partnerId) return;
    setActionLoading(true);
    try {
      const updated = await archiveProduct(productId, partnerId);
      if (updated) {
        setProduct(updated);
        router.push("/store/inventory");
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 rounded bg-muted/60 animate-pulse" />
        <div className="h-64 rounded-xl border border-border/60 bg-muted/40 animate-pulse" />
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="space-y-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/store/inventory">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to inventory
          </Link>
        </Button>
        <Card className="border-border max-w-md">
          <CardContent className="py-6">
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="space-y-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/store/inventory">Back to inventory</Link>
        </Button>
        <p className="text-muted-foreground">Product not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24">
      <Button variant="outline" size="sm" asChild>
        <Link href="/store/inventory">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to inventory
        </Link>
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">{product.name}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant={(product.stock ?? 0) < 10 ? "warning" : "secondary"}
          >
            Stock: {product.stock ?? 0}
          </Badge>
          <Badge
            variant={
              status === "LIVE"
                ? "default"
                : status === "DRAFT" || status === "REJECTED"
                ? "secondary"
                : "outline"
            }
          >
            {(product.approvalStatus ?? "LIVE").replace(/_/g, " ")}
          </Badge>
          {canSubmitForReview && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSubmitForReview}
              disabled={actionLoading}
            >
              <Send className="h-4 w-4 mr-1" /> Submit for Approval
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleArchive}
            disabled={actionLoading}
          >
            <Archive className="h-4 w-4 mr-1" /> Archive
          </Button>
        </div>
      </div>

      {product.rejectionReason && (
        <Card className="border-border border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-3">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Rejection reason
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {product.rejectionReason}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-lg">
                Edit product
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                id="edit-product-form"
                onSubmit={handleSave}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="stock">Stock</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="visibility"
                    checked={visibility}
                    onChange={(e) => setVisibility(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor="visibility">Visible to customers</Label>
                </div>
                <div>
                  <Label>Images</Label>
                  <p className="text-sm text-muted-foreground">
                    Image update (UI placeholder).
                  </p>
                </div>
                <Button type="submit" disabled={saving} className="sm:hidden">
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <BarChart2 className="h-4 w-4" /> Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sales count</span>
                <span>{product.salesCount ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Views count</span>
                <span>{product.viewsCount ?? 0}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border mt-4">
            <CardContent className="pt-4">
              <div className="w-full h-32 rounded-lg bg-muted/80 flex items-center justify-center">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt=""
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground/60" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {product.category}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sticky action footer */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-card border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.2)]">
        <div className="container px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-3">
            <Button
              type="submit"
              form="edit-product-form"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
            {canSubmitForReview && (
              <Button
                variant="outline"
                onClick={handleSubmitForReview}
                disabled={actionLoading}
              >
                {actionLoading ? "Submitting…" : "Submit for Approval"}
              </Button>
            )}
          </div>
          <Button variant="ghost" asChild>
            <Link href="/store/inventory">Cancel</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

