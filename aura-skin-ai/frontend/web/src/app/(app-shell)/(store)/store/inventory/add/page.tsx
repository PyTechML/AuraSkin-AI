"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPartnerProduct, uploadPartnerProductImage } from "@/services/apiPartner";
import { useAuth } from "@/providers/AuthProvider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Check, ImageIcon, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePanelToast } from "@/components/panel/PanelToast";

const DESCRIPTION_MAX = 300;

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return "Just now";
  if (diffMins === 1) return "1 minute ago";
  if (diffMins < 60) return `${diffMins} minutes ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return "1 hour ago";
  return `${diffHours} hours ago`;
}

const CATEGORIES = [
  "Cleanser",
  "Serum",
  "Sunscreen",
  "Moisturizer",
  "Treatment",
  "Other",
];

const STEPS = [
  { id: "basic", label: "Basic Info" },
  { id: "media", label: "Media" },
  { id: "pricing", label: "Pricing" },
  { id: "inventory", label: "Inventory" },
  { id: "seo", label: "SEO" },
  { id: "preview", label: "Preview" },
] as const;

const META_TITLE_MAX = 60;
const META_DESC_MAX = 160;

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function StoreAddProductPage() {
  const router = useRouter();
  const { session } = useAuth();
  const { addToast } = usePanelToast();
  const partnerId = session?.user?.id ?? "";
  const [activeTab, setActiveTab] = useState("basic");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [showDiscount, setShowDiscount] = useState(false);
  const [discount, setDiscount] = useState("");
  const [taxIncluded, setTaxIncluded] = useState(false);
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [usage, setUsage] = useState("");
  const [visibility, setVisibility] = useState(true);
  const [sku, setSku] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("10");
  const [autoOutOfStock, setAutoOutOfStock] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [costPerItem, setCostPerItem] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  const [, setSaveLabelTick] = useState(0);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(
    new Set(["basic"])
  );
  const [images, setImages] = useState<{ id: string; url: string }[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!lastSavedAt) return;
    const id = setInterval(() => setSaveLabelTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, [lastSavedAt]);

  const markVisited = useCallback((tab: string) => {
    setVisitedTabs((prev) => new Set(prev).add(tab));
  }, []);

  const validateBasic = (): boolean => {
    const err: Record<string, string> = {};
    if (!name.trim()) err.name = "Product name is required.";
    if (!category) err.category = "Category is required.";
    setValidationErrors((e) => ({ ...e, ...err }));
    return Object.keys(err).length === 0;
  };

  const validatePricing = (): boolean => {
    const err: Record<string, string> = {};
    const p = parseFloat(price);
    if (isNaN(p) || p < 0) err.price = "Valid price is required.";
    setValidationErrors((e) => ({ ...e, ...err }));
    return Object.keys(err).length === 0;
  };

  const validateInventory = (): boolean => {
    const err: Record<string, string> = {};
    const s = parseInt(stock, 10);
    if (isNaN(s) || s < 0) err.stock = "Valid stock quantity is required.";
    setValidationErrors((e) => ({ ...e, ...err }));
    return Object.keys(err).length === 0;
  };

  const validateAll = (): boolean => {
    const err: Record<string, string> = {};
    if (!name.trim()) err.name = "Product name is required.";
    if (!category) err.category = "Category is required.";
    const p = parseFloat(price);
    if (isNaN(p) || p < 0) err.price = "Valid price is required.";
    const s = parseInt(stock, 10);
    if (isNaN(s) || s < 0) err.stock = "Valid stock quantity is required.";
    if (!description.trim()) err.description = "Description is required.";
    setValidationErrors(err);
    return Object.keys(err).length === 0;
  };

  const goToTab = (tab: string) => {
    if (tab === "pricing" && !validateBasic()) return;
    if (tab === "inventory" && !validatePricing()) return;
    if (tab === "seo" && !validateInventory()) return;
    setActiveTab(tab);
    markVisited(tab);
  };

  const buildPayload = () => ({
    name: name.trim(),
    category,
    price: parseFloat(price) || 0,
    discount: showDiscount && discount ? parseFloat(discount) : undefined,
    stock: parseInt(stock, 10) || 0,
    description: description.trim(),
    ingredients: ingredients.trim()
      ? ingredients.split(",").map((x) => x.trim())
      : undefined,
    usage: usage.trim() || undefined,
    visibility,
    imageUrls: images.map((image) => image.url),
  });

  const resetForm = () => {
    setName("");
    setCategory("");
    setPrice("");
    setShowDiscount(false);
    setDiscount("");
    setTaxIncluded(false);
    setStock("");
    setDescription("");
    setIngredients("");
    setUsage("");
    setVisibility(true);
    setSku("");
    setLowStockThreshold("10");
    setAutoOutOfStock(false);
    setMetaTitle("");
    setMetaDescription("");
    setCostPerItem("");
    setActiveTab("basic");
    setVisitedTabs(new Set(["basic"]));
    setValidationErrors({});
    setImages([]);
  };

  const handleImageSelection = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingImages(true);
    try {
      const selected = Array.from(files).slice(0, 6);
      const uploaded = await Promise.all(
        selected.map(async (file) => {
          const url = await uploadPartnerProductImage(file);
          return { id: `${Date.now()}-${file.name}`, url };
        })
      );
      setImages(uploaded);
      addToast("Image upload completed.");
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : "Failed to upload product images.";
      addToast(message, "error");
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll() || !partnerId) return;
    setSubmitting(true);
    setValidationErrors({});
    try {
      await createPartnerProduct(partnerId, {
        ...buildPayload(),
        approvalStatus: "DRAFT",
      });
      setLastSavedAt(new Date());
      setSuccessBanner(true);
      addToast("Draft saved successfully.");
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Failed to save draft. Please try again.";
      setValidationErrors({
        form: message,
      });
      addToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitForApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll() || !partnerId) return;
    setSubmitting(true);
    setValidationErrors({});
    try {
      const created = await createPartnerProduct(partnerId, {
        ...buildPayload(),
        approvalStatus: "PENDING",
      });
      setLastSavedAt(new Date());
      setSuccessBanner(true);
      addToast("Product submitted for admin approval");
      void created;
      resetForm();
      router.push("/store/inventory");
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Failed to submit product. Please try again.";
      setValidationErrors({ form: message });
      addToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTabChange = (v: string) => {
    setActiveTab(v);
    setVisitedTabs((prev) => new Set(prev).add(v));
  };

  const basePrice = parseFloat(price) || 0;
  const discountPct =
    showDiscount && discount ? parseFloat(discount) : 0;
  const finalPrice = basePrice * (1 - discountPct / 100);
  const slug = slugFromName(name);
  const metaTitleLen = metaTitle.length;
  const metaDescLen = metaDescription.length;

  const currentStepIndex = STEPS.findIndex((s) => s.id === activeTab);
  const progressPercent = Math.round(((currentStepIndex + 1) / STEPS.length) * 100);
  const isStepCompleted = (stepId: string) => {
    const i = STEPS.findIndex((s) => s.id === stepId);
    return visitedTabs.has(stepId) && i < currentStepIndex;
  };

  const isBasicComplete = Boolean(name.trim() && category);
  const isPricingComplete = !isNaN(parseFloat(price)) && parseFloat(price) >= 0;
  const isInventoryComplete =
    !isNaN(parseInt(stock, 10)) && parseInt(stock, 10) >= 0;
  const isMediaComplete = images.length > 0;
  const isSeoComplete = metaTitle.length > 0 || metaDescription.length > 0;

  const currentStock = parseInt(stock || "0", 10);
  const threshold = parseInt(lowStockThreshold || "0", 10);
  const inventoryStatus =
    currentStock === 0
      ? "out"
      : currentStock <= threshold
        ? "low"
        : "healthy";

  const costNum = parseFloat(costPerItem) || 0;
  const marginPercent =
    finalPrice > 0 && costNum >= 0
      ? Math.round(((finalPrice - costNum) / finalPrice) * 100)
      : null;

  return (
    <div
      className={cn(
        "pb-24 transition-all duration-[250ms] ease-out",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      )}
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.3fr)]">
        {/* Left column: form */}
        <div className="min-w-0 space-y-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/store/inventory">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to inventory
            </Link>
          </Button>

          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/80">
              Store · Inventory
            </p>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Add Product
            </h1>
            <p className="text-sm text-muted-foreground">
              Create a structured listing for your store inventory.
            </p>
          </div>

          {successBanner && (
            <div className="rounded-xl border border-border/60 bg-green-500/10 text-green-800 dark:text-green-200 px-4 py-3 text-sm font-label">
              Product saved successfully.
            </div>
          )}

          <form id="add-product-form" onSubmit={handleSaveDraft}>
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <div className="flex flex-1 items-center gap-0">
                  {STEPS.map((step, i) => (
                    <div key={step.id} className="flex items-center">
                      <button
                        type="button"
                        onClick={() => goToTab(step.id)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors duration-200",
                          activeTab === step.id
                            ? "bg-primary text-primary-foreground font-medium"
                            : "text-muted-foreground hover:bg-muted/60",
                          isStepCompleted(step.id) &&
                            activeTab !== step.id &&
                            "text-green-600 dark:text-green-400"
                        )}
                      >
                        {isStepCompleted(step.id) ? (
                          <Check className="h-4 w-4 shrink-0" />
                        ) : (
                          <span
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs",
                              activeTab === step.id
                                ? "border-primary-foreground"
                                : "border-current"
                            )}
                          >
                            {i + 1}
                          </span>
                        )}
                        <span className="hidden sm:inline">{step.label}</span>
                      </button>
                      {i < STEPS.length - 1 && (
                        <div
                          className={cn(
                            "h-px w-4 shrink-0 sm:w-6",
                            isStepCompleted(step.id)
                              ? "bg-green-500/50"
                              : "bg-border"
                          )}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {progressPercent}% Complete
                </span>
              </div>
              <Progress
                value={progressPercent}
                className="mt-2 h-1.5"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Complete all required sections before submitting for approval.
              </p>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-6 max-w-3xl mb-4">
                {STEPS.map((s) => (
                  <TabsTrigger
                    key={s.id}
                    value={s.id}
                    onClick={() => goToTab(s.id)}
                  >
                    {s.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent
                value="basic"
                className="mt-4 data-[state=inactive]:pointer-events-none data-[state=inactive]:opacity-0 transition-opacity duration-200"
              >
                <p className="text-muted-foreground text-sm mb-3">
                  Enter the core product details. Name and category are required.
                </p>
                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="font-heading text-lg">
                      Basic information
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Name and category are required. Add description and usage
                      to help customers.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Product name *</Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Gentle Hydrating Cleanser"
                          className={cn(
                            "transition-opacity duration-150",
                            validationErrors.name && "border-destructive"
                          )}
                        />
                        <p className="text-xs text-muted-foreground">
                          Clear, search-friendly name.
                        </p>
                        {validationErrors.name && (
                          <p className="text-sm text-destructive animate-in fade-in duration-150">
                            {validationErrors.name}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category *</Label>
                        <select
                          id="category"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className={cn(
                            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                            validationErrors.category && "border-destructive"
                          )}
                        >
                          <option value="">Select category</option>
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        {validationErrors.category && (
                          <p className="text-sm text-destructive animate-in fade-in duration-150">
                            {validationErrors.category}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="description">Description *</Label>
                      <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Product description..."
                        className={cn(
                          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                          validationErrors.description && "border-destructive"
                        )}
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        {description.length}/{DESCRIPTION_MAX} characters ·
                        Brief description for the product page.
                      </p>
                      {validationErrors.description && (
                        <p className="text-sm text-destructive animate-in fade-in duration-150">
                          {validationErrors.description}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="ingredients">
                          Ingredients (comma-separated)
                        </Label>
                        <Input
                          id="ingredients"
                          value={ingredients}
                          onChange={(e) => setIngredients(e.target.value)}
                          placeholder="Ingredient 1, Ingredient 2"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="usage">Usage guide</Label>
                        <textarea
                          id="usage"
                          value={usage}
                          onChange={(e) => setUsage(e.target.value)}
                          placeholder="How to use..."
                          className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          rows={2}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        type="button"
                        onClick={() => goToTab("media")}
                        className="transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md"
                      >
                        Next: Media
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent
                value="media"
                className="mt-4 data-[state=inactive]:pointer-events-none data-[state=inactive]:opacity-0 transition-opacity duration-200"
              >
                <p className="text-muted-foreground text-sm mb-3">
                  Upload product images. First image will be used as the main
                  thumbnail.
                </p>
                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="font-heading text-lg">
                      Media
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Drag and drop or click to upload. Accepted: JPG, PNG,
                      WebP. Max 5MB per file.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
                      <div
                        className="border-2 border-dashed border-border/60 rounded-xl p-8 text-center text-muted-foreground text-sm transition-colors hover:border-muted-foreground/30 min-h-[180px] flex flex-col items-center justify-center"
                        role="button"
                        tabIndex={0}
                        onClick={() => fileInputRef.current?.click()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            fileInputRef.current?.click();
                          }
                        }}
                      >
                        <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-60" />
                        <p>Drag and drop images here, or click to browse.</p>
                        <p className="text-xs mt-1">
                          Accepted: JPG, PNG, WebP. Max 5MB per file.
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => void handleImageSelection(e.target.files)}
                        />
                        {uploadingImages && (
                          <p className="text-xs mt-2 text-muted-foreground">Uploading images...</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Image preview
                        </p>
                        {images.length === 0 ? (
                          <div className="rounded-lg border border-border/60 bg-muted/30 aspect-square flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                            <p className="text-xs text-muted-foreground/70 ml-2">
                              No images yet
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {images.map((img) => (
                              <div
                                key={img.id}
                                className="aspect-square rounded-lg border border-border/60 bg-muted/30 flex items-center justify-center overflow-hidden"
                              >
                                <img src={img.url} alt="" className="h-full w-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Use clear, well-lit images with minimal background.
                          1024×1024 recommended.
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        type="button"
                        onClick={() => goToTab("pricing")}
                        className="transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md"
                      >
                        Next: Pricing
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent
                value="pricing"
                className="mt-4 data-[state=inactive]:pointer-events-none data-[state=inactive]:opacity-0 transition-opacity duration-200"
              >
                <p className="text-muted-foreground text-sm mb-3">
                  Set base price and optional discount. Final price updates in
                  real time.
                </p>
                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="font-heading text-lg">
                      Pricing
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Base price is required. Enable discount for a percentage
                      off.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="price">Base price *</Label>
                          <Input
                            id="price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder="0.00"
                            className={validationErrors.price ? "border-destructive" : ""}
                          />
                          {validationErrors.price && (
                            <p className="text-sm text-destructive animate-in fade-in duration-150">
                              {validationErrors.price}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="showDiscount"
                            checked={showDiscount}
                            onChange={(e) =>
                              setShowDiscount(e.target.checked)
                            }
                            className="rounded border-input"
                          />
                          <Label htmlFor="showDiscount">Apply discount</Label>
                        </div>
                        {showDiscount && (
                          <div className="space-y-2">
                            <Label htmlFor="discount">Discount %</Label>
                            <Input
                              id="discount"
                              type="number"
                              min="0"
                              max="100"
                              value={discount}
                              onChange={(e) => setDiscount(e.target.value)}
                              placeholder="0"
                            />
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label htmlFor="costPerItem">Cost per item (optional)</Label>
                          <Input
                            id="costPerItem"
                            type="number"
                            step="0.01"
                            min="0"
                            value={costPerItem}
                            onChange={(e) => setCostPerItem(e.target.value)}
                            placeholder="0.00"
                          />
                          <p className="text-xs text-muted-foreground">
                            For margin calculation only.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="taxIncluded"
                            checked={taxIncluded}
                            onChange={(e) =>
                              setTaxIncluded(e.target.checked)
                            }
                            className="rounded border-input"
                          />
                          <Label htmlFor="taxIncluded">Price includes tax</Label>
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3 transition-opacity duration-150">
                        <p className="text-sm font-medium">Pricing summary</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Base price
                            </span>
                            <span>${basePrice.toFixed(2)}</span>
                          </div>
                          {discountPct > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Discount
                              </span>
                              <span>-{discountPct}%</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-2 border-t border-border/60">
                            <span className="font-medium">Final price</span>
                            <span
                              className={cn(
                                "font-semibold transition-all duration-150",
                                finalPrice > 0 && "text-primary"
                              )}
                            >
                              ${finalPrice.toFixed(2)}
                              {taxIncluded && (
                                <span className="text-xs font-normal text-muted-foreground ml-1">
                                  (tax incl.)
                                </span>
                              )}
                            </span>
                          </div>
                          {marginPercent !== null && (
                            <div className="pt-2 border-t border-border/60">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  Margin
                                </span>
                                <span
                                  className={cn(
                                    marginPercent < 20
                                      ? "text-amber-600 dark:text-amber-400"
                                      : "text-foreground"
                                  )}
                                >
                                  {marginPercent}%
                                </span>
                              </div>
                              {marginPercent < 20 && marginPercent >= 0 && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                  Margin below 20% – consider adjusting price.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        type="button"
                        onClick={() => goToTab("inventory")}
                        className="transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md"
                      >
                        Next: Inventory
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent
                value="inventory"
                className="mt-4 data-[state=inactive]:pointer-events-none data-[state=inactive]:opacity-0 transition-opacity duration-200"
              >
                <p className="text-muted-foreground text-sm mb-3">
                  Stock quantity and visibility. Use low stock threshold to get
                  alerts.
                </p>
                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="font-heading text-lg">
                      Inventory
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Stock quantity is required. Optionally set SKU and
                      low-stock rules.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="sku">SKU (optional)</Label>
                          <Input
                            id="sku"
                            value={sku}
                            onChange={(e) => setSku(e.target.value)}
                            placeholder="e.g. CLN-001"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="stock">Stock quantity *</Label>
                          <Input
                            id="stock"
                            type="number"
                            min="0"
                            value={stock}
                            onChange={(e) => setStock(e.target.value)}
                            placeholder="0"
                            className={validationErrors.stock ? "border-destructive" : ""}
                          />
                          {validationErrors.stock && (
                            <p className="text-sm text-destructive animate-in fade-in duration-150">
                              {validationErrors.stock}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lowStockThreshold">
                            Low stock threshold
                          </Label>
                          <Input
                            id="lowStockThreshold"
                            type="number"
                            min="0"
                            value={lowStockThreshold}
                            onChange={(e) =>
                              setLowStockThreshold(e.target.value)
                            }
                            placeholder="10"
                          />
                          <p className="text-xs text-muted-foreground">
                            Alert when stock falls below this.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="autoOutOfStock"
                            checked={autoOutOfStock}
                            onChange={(e) =>
                              setAutoOutOfStock(e.target.checked)
                            }
                            className="rounded border-input"
                          />
                          <Label htmlFor="autoOutOfStock">
                            Auto mark out of stock when below threshold
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="visibility"
                            checked={visibility}
                            onChange={(e) =>
                              setVisibility(e.target.checked)
                            }
                            className="rounded border-input"
                          />
                          <Label htmlFor="visibility">
                            Visible to customers
                          </Label>
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-2">
                        <p className="text-sm font-medium">Stock status</p>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            inventoryStatus === "out" &&
                              "bg-red-500/10 text-red-600 dark:text-red-400",
                            inventoryStatus === "low" &&
                              "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                            inventoryStatus === "healthy" &&
                              "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          {inventoryStatus === "out"
                            ? "Out of stock"
                            : inventoryStatus === "low"
                              ? "Low stock"
                              : "Healthy"}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          We'll alert you when stock drops below the threshold.
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        type="button"
                        onClick={() => goToTab("seo")}
                        className="transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md"
                      >
                        Next: SEO
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent
                value="seo"
                className="mt-4 data-[state=inactive]:pointer-events-none data-[state=inactive]:opacity-0 transition-opacity duration-200"
              >
                <p className="text-muted-foreground text-sm mb-3">
                  Optional meta title and description for search engines. Slug
                  is derived from the product name.
                </p>
                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="font-heading text-lg">
                      SEO
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Meta title and description improve search visibility. Keep
                      title under 60 characters.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="metaTitle">Meta title</Label>
                          <Input
                            id="metaTitle"
                            value={metaTitle}
                            onChange={(e) => setMetaTitle(e.target.value)}
                            placeholder="Product page title for search"
                            maxLength={META_TITLE_MAX}
                          />
                          <p className="text-xs text-muted-foreground">
                            {metaTitleLen}/{META_TITLE_MAX} characters
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="metaDescription">
                            Meta description
                          </Label>
                          <textarea
                            id="metaDescription"
                            value={metaDescription}
                            onChange={(e) =>
                              setMetaDescription(e.target.value)
                            }
                            placeholder="Short description for search results"
                            className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            rows={2}
                            maxLength={META_DESC_MAX}
                          />
                          <p className="text-xs text-muted-foreground">
                            {metaDescLen}/{META_DESC_MAX} characters
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Slug preview</Label>
                          <p className="text-sm font-mono text-muted-foreground break-all">
                            {slug || "—"}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-background p-4 space-y-2 text-sm transition-opacity duration-150">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Search preview
                        </p>
                        <p className="text-lg text-blue-600 dark:text-blue-400 truncate">
                          {metaTitle || name || "Product title"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          auraskin.ai/store/{slug || "product"}
                        </p>
                        <p className="text-muted-foreground line-clamp-2">
                          {metaDescription ||
                            description ||
                            "Search result description preview."}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        type="button"
                        onClick={() => goToTab("preview")}
                        className="transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md"
                      >
                        Next: Preview
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent
                value="preview"
                className="mt-4 data-[state=inactive]:pointer-events-none data-[state=inactive]:opacity-0 transition-opacity duration-200"
              >
                <p className="text-muted-foreground text-sm mb-3">
                  Review how your product will appear. Submit when ready.
                </p>
                <Card className="border-border/60 overflow-hidden">
                  <CardContent className="p-0">
                    <div className="aspect-video w-full max-h-56 bg-muted/40 flex items-center justify-center">
                      {images[0]?.url ? (
                        <img src={images[0].url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            inventoryStatus === "out" &&
                              "bg-red-500/10 text-red-600 dark:text-red-400",
                            inventoryStatus === "low" &&
                              "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                            inventoryStatus === "healthy" &&
                              "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          {inventoryStatus === "out"
                            ? "Out of stock"
                            : inventoryStatus === "low"
                              ? "Low stock"
                              : "In stock"}
                        </span>
                      </div>
                      <p className="font-heading font-semibold text-lg">
                        {name || "Product name"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {category || "Category"}
                      </p>
                      <p className="text-lg font-semibold">
                        ${finalPrice.toFixed(2)}
                        {discountPct > 0 && (
                          <span className="text-sm font-normal text-muted-foreground line-through ml-2">
                            ${basePrice.toFixed(2)}
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {description || "No description."}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
                        {(["basic", "media", "pricing", "inventory", "seo"] as const).map(
                          (stepId) => (
                            <Button
                              key={stepId}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => goToTab(stepId)}
                              className="transition-transform duration-150 hover:-translate-y-0.5"
                            >
                              Edit {STEPS.find((s) => s.id === stepId)?.label}
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {validationErrors.form && (
              <p className="text-sm text-destructive mt-4 animate-in fade-in duration-150">
                {validationErrors.form}
              </p>
            )}
          </form>
        </div>

        {/* Right column: context panel */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card
            className="border-border/60 transition-opacity duration-150"
            key={`preview-${activeTab}-${name.slice(0, 8)}`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm">
                Live product preview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="aspect-square w-full max-h-36 rounded-t-lg bg-muted/40 flex items-center justify-center border-b border-border/60">
                {images[0]?.url ? (
                  <img src={images[0].url} alt="" className="h-full w-full object-cover rounded-t-lg" />
                ) : (
                  <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                )}
              </div>
              <div className="p-3 space-y-1">
                <p className="font-heading font-medium truncate">
                  {name || "Product name"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {category || "Category"}
                </p>
                <p className="text-sm font-semibold">
                  ${finalPrice.toFixed(2)}
                  {discountPct > 0 && (
                    <span className="text-xs font-normal text-muted-foreground line-through ml-1">
                      ${basePrice.toFixed(2)}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {description || "No description."}
                </p>
                <span
                  className={cn(
                    "inline-flex text-xs font-medium",
                    inventoryStatus === "out" && "text-red-600 dark:text-red-400",
                    inventoryStatus === "low" &&
                      "text-amber-600 dark:text-amber-400",
                    inventoryStatus === "healthy" &&
                      "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {inventoryStatus === "out"
                    ? "Out of stock"
                    : inventoryStatus === "low"
                      ? "Low stock"
                      : "In stock"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm">
                Completion checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                {
                  id: "basic",
                  label: "Basic Info",
                  done: isBasicComplete,
                },
                { id: "media", label: "Media", done: isMediaComplete },
                {
                  id: "pricing",
                  label: "Pricing",
                  done: isPricingComplete,
                },
                {
                  id: "inventory",
                  label: "Inventory",
                  done: isInventoryComplete,
                },
                { id: "seo", label: "SEO", done: isSeoComplete },
              ].map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 text-sm"
                >
                  {item.done ? (
                    <Check className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                  )}
                  <span
                    className={item.done ? "text-foreground" : "text-muted-foreground"}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm">
                Listing status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">Draft</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last saved</span>
                <span className="text-muted-foreground">
                  {lastSavedAt
                    ? formatRelativeTime(lastSavedAt)
                    : "Not yet saved"}
                </span>
              </div>
              <div className="pt-2 border-t border-border/60 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Tips
                </p>
                <p className="text-xs text-muted-foreground">
                  High-quality images increase conversion by 32%.
                </p>
                <p className="text-xs text-muted-foreground">
                  Use descriptive titles for better discoverability.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-10 bg-card border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.2)] transition-shadow duration-150">
        <div className="container px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-3">
            <Button
              type="submit"
              form="add-product-form"
              variant="outline"
              disabled={submitting}
              className="transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md"
            >
              {submitting ? "Saving…" : "Save Draft"}
            </Button>
          </div>
          <div className="flex-1 flex justify-center min-w-0">
            <p className="text-xs text-muted-foreground truncate">
              {lastSavedAt
                ? `Saved ${formatRelativeTime(lastSavedAt)}`
                : "Not yet saved"}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" asChild>
              <Link href="/store/inventory">Cancel</Link>
            </Button>
            <Button
              type="button"
              disabled={submitting}
              onClick={handleSubmitForApproval}
              className="transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md"
            >
              {submitting ? "Submitting…" : "Submit for Approval"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

