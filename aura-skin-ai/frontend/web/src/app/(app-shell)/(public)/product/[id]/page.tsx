import Link from "next/link";
import { getProductById, getSimilarProducts } from "@/services/api";
import { ProductDetailsActions } from "@/components/products/ProductDetailsActions";
import { ProductCard } from "@/components/products/ProductCard";
import { notFound } from "next/navigation";
import { ImageIcon, ChevronRight, Sparkles, ShieldCheck, Truck, CheckCircle2, Package, HelpCircle } from "lucide-react";

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getProductById(params.id);
  if (!product) notFound();

  const fullDescription = product.fullDescription ?? product.description;
  const keyIngredients = product.keyIngredients ?? [];
  const usage = product.usage ?? "";
  const safetyNotes = product.safetyNotes ?? "";
  const similarProducts = await getSimilarProducts(product.id, 4);

  return (
    <div className="bg-background text-foreground min-h-[60vh] w-full">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Breadcrumb */}
        <nav className="mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm font-label text-muted-foreground">
            <li>
              <Link href="/products" className="hover:text-foreground transition-colors">
                Products
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </li>
            <li className="text-foreground truncate max-w-[200px] sm:max-w-none" aria-current="page">
              {product.name}
            </li>
          </ol>
        </nav>

        {/* Three-area: image, details, sidebar — full width */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 mb-16">
          {/* Left: product image */}
          <div className="lg:col-span-5">
            <div
              className="relative w-full aspect-[4/3] lg:aspect-square max-h-[480px] lg:max-h-none bg-muted/80 overflow-hidden rounded-2xl border border-border"
              aria-hidden
            >
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                  <ImageIcon className="h-16 w-16 text-muted-foreground/60" aria-hidden />
                  <span className="text-sm font-label text-muted-foreground/80">
                    Image unavailable
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Center: product details + actions */}
          <div className="lg:col-span-4 flex flex-col">
            <span className="inline-block text-xs font-label text-accent bg-accent/10 border border-accent/20 rounded-full px-3 py-1 mb-3 w-fit">
              {product.category}
            </span>
            <h1 className="font-heading text-2xl md:text-3xl font-semibold text-foreground tracking-tight mb-3">
              {product.name}
            </h1>
            <p className="text-muted-foreground font-body leading-relaxed text-[15px] mb-6">
              {product.description}
            </p>
            <p className="text-sm font-label text-muted-foreground/90 mb-6">
              Part of our AI-curated skincare range. Selected to support your skin goals.
            </p>
            <div className="space-y-2 mb-6">
              <p className="text-sm font-body text-muted-foreground/80">
                Ideal for daily use and designed to layer well with your existing routine.
              </p>
              <p className="text-sm font-body text-muted-foreground/80">
                Formulated with quality ingredients for visible results. Suitable for all skin types—use consistently as part of your regimen for best outcomes.
              </p>
            </div>
            <div className="pt-6 border-t border-border/60">
              <ProductDetailsActions productId={product.id} productName={product.name} />
            </div>
          </div>

          {/* Right: trust + delivery sidebar — stacked cards to fill space */}
          <div className="lg:col-span-3 flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border/60 bg-muted/10 p-5 lg:p-6 space-y-4">
              <h3 className="font-heading text-sm font-semibold text-foreground uppercase tracking-wide">
                Why shop with us
              </h3>
              <ul className="space-y-3 text-sm font-body text-muted-foreground">
                <li className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 shrink-0 text-accent mt-0.5" aria-hidden />
                  <span>AI-matched to your skin profile and goals</span>
                </li>
                <li className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-accent mt-0.5" aria-hidden />
                  <span>Curated, quality formulas you can trust</span>
                </li>
                <li className="flex items-start gap-3">
                  <Truck className="h-5 w-5 shrink-0 text-accent mt-0.5" aria-hidden />
                  <span>Fast, reliable delivery</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-accent mt-0.5" aria-hidden />
                  <span>Easy returns if it&apos;s not the right fit</span>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/10 p-5 lg:p-6 space-y-3">
              <h3 className="font-heading text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
                <Package className="h-4 w-4 text-accent" aria-hidden />
                Delivery & returns
              </h3>
              <p className="text-sm font-body text-muted-foreground leading-relaxed">
                Free delivery on orders over a threshold. Standard delivery 3–5 working days. 30-day returns on unopened products.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/10 p-5 lg:p-6">
              <h3 className="font-heading text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2 mb-2">
                <HelpCircle className="h-4 w-4 text-accent" aria-hidden />
                Need help?
              </h3>
              <p className="text-sm font-body text-muted-foreground leading-relaxed">
                <Link href="/contact" className="text-accent hover:underline">Contact us</Link> or visit our <Link href="/faq" className="text-accent hover:underline">FAQ</Link> for product and order support.
              </p>
            </div>
          </div>
        </div>

        {/* Description block — three columns on xl to fill width */}
        <section className="rounded-2xl border border-border/60 bg-muted/20 px-6 py-8 md:px-8 md:py-10 mb-12 w-full">
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            Product details
          </h2>
          <p className="text-sm text-muted-foreground font-body mb-6">
            Learn more about this product, how to use it, and what to expect.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
            {/* Left column */}
            <div className="lg:col-span-1 space-y-6">
              <div>
                <h3 className="font-heading text-base font-semibold text-foreground mb-3">
                  Full description
                </h3>
                <p className="text-muted-foreground font-body leading-relaxed text-[15px]">
                  {fullDescription}
                </p>
              </div>
              {keyIngredients.length > 0 && (
                <div>
                  <h3 className="font-heading text-base font-semibold text-foreground mb-3">
                    Key ingredients
                  </h3>
                  <ul className="list-disc list-outside pl-5 text-muted-foreground font-body space-y-2 text-[15px]">
                    {keyIngredients.map((ingredient) => (
                      <li key={ingredient}>{ingredient}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {/* Middle column */}
            <div className="space-y-6">
              {usage && (
                <div>
                  <h3 className="font-heading text-base font-semibold text-foreground mb-3">
                    How to use
                  </h3>
                  <p className="text-muted-foreground font-body leading-relaxed text-[15px]">
                    {usage}
                  </p>
                </div>
              )}
              {safetyNotes && (
                <div>
                  <h3 className="font-heading text-base font-semibold text-foreground mb-3">
                    Safety notes
                  </h3>
                  <p className="text-muted-foreground font-body leading-relaxed text-[15px]">
                    {safetyNotes}
                  </p>
                </div>
              )}
            </div>
            {/* Right column: at a glance — fills remaining space */}
            <div className="rounded-xl border border-border/50 bg-background/60 p-5 h-fit">
              <h3 className="font-heading text-base font-semibold text-foreground mb-4">
                At a glance
              </h3>
              <dl className="space-y-3 text-sm font-body">
                <div>
                  <dt className="text-muted-foreground font-label">Category</dt>
                  <dd className="text-foreground font-medium mt-0.5">{product.category}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-label">Best for</dt>
                  <dd className="text-foreground font-medium mt-0.5">All skin types</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-label">Format</dt>
                  <dd className="text-foreground font-medium mt-0.5">{product.category}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-label">Application</dt>
                  <dd className="text-foreground font-medium mt-0.5">Apply to clean skin as directed above</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        {/* Similar products or explore CTA — full width */}
        {similarProducts.length > 0 ? (
          <section className="border-t border-border/60 pt-10 pb-10 w-full">
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
              You may also like
            </h2>
            <p className="text-sm text-muted-foreground font-body mb-6">
              Other {product.category.toLowerCase()} products that pair well with your routine.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 w-full">
              {similarProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            <div className="mt-6">
              <Link
                href="/products"
                className="text-sm font-label text-accent hover:underline"
              >
                View all products
              </Link>
            </div>
          </section>
        ) : (
          <section className="border-t border-border/60 pt-10 pb-10">
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
              Explore more
            </h2>
            <p className="text-sm text-muted-foreground font-body mb-6">
              Discover our full range of AI-curated skincare products.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-sm font-label text-accent hover:underline"
            >
              View all products
              <ChevronRight className="h-4 w-4" />
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
