import Link from "next/link";
import { notFound } from "next/navigation";
import { getStoreById, getStoreProducts } from "@/services/api";
import { ChevronRight, MapPin, Clock, Phone, ImageIcon } from "lucide-react";

const UUID_LIKE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function readableStoreName(name: string | null | undefined): string {
  const value = typeof name === "string" ? name.trim() : "";
  if (!value || UUID_LIKE_RE.test(value)) return "Store";
  return value;
}

export default async function StoreDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const store = await getStoreById(params.id);
  if (!store) notFound();

  const storeProducts = await getStoreProducts(params.id);

  return (
    <div className="space-y-8">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/stores" className="hover:text-foreground transition-colors">
          Stores
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{readableStoreName(store.name)}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="aspect-video w-full rounded-2xl border border-border overflow-hidden bg-muted/80 flex items-center justify-center">
            <div className="text-center">
              <ImageIcon className="h-16 w-16 text-muted-foreground/60 mx-auto mb-2" />
              <span className="text-sm text-muted-foreground">Store banner</span>
            </div>
          </div>

          <div>
            <h1 className="font-heading text-2xl font-semibold">{readableStoreName(store.name)}</h1>
            {store.rating != null && (
              <p className="text-muted-foreground mt-1">★ {store.rating} rating</p>
            )}
            {store.description && (
              <p className="text-muted-foreground mt-4">{store.description}</p>
            )}
          </div>

          {store.openingHours && (
            <div className="flex gap-3">
              <Clock className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium">Opening hours</h3>
                <p className="text-sm text-muted-foreground">{store.openingHours}</p>
              </div>
            </div>
          )}

          {store.contact && (
            <div className="flex gap-3">
              <Phone className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium">Contact</h3>
                <a href={`tel:${store.contact}`} className="text-sm text-accent hover:underline">
                  {store.contact}
                </a>
              </div>
            </div>
          )}

          {storeProducts.length > 0 && (
            <div>
              <h2 className="font-heading text-lg font-semibold mb-4">Available products</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {storeProducts.map((p) => {
                  const thumb = p.imageUrl?.trim();
                  return (
                  <Link
                    key={p.id}
                    href={`/shop/${p.id}`}
                    className="flex gap-3 p-3 rounded-xl border border-border hover:bg-muted/40 transition-colors"
                  >
                    <div className="w-12 h-12 shrink-0 rounded-lg bg-muted/80 overflow-hidden flex items-center justify-center relative">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={p.name}
                          className="absolute inset-0 w-full h-full object-cover object-center"
                        />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-muted-foreground/60" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ${p.price?.toFixed(2) ?? "—"}
                      </p>
                    </div>
                  </Link>
                  );
                })}
              </div>
              <Link
                href={`/shop?store=${encodeURIComponent(params.id)}`}
                className="text-sm text-accent hover:underline mt-2 inline-block"
              >
                View all products from this store
              </Link>
            </div>
          )}
        </div>

        <div>
          <div className="sticky top-24 space-y-4">
            {store.address && (
              <div className="rounded-2xl border border-border/60 bg-muted/10 p-5">
                <h3 className="font-heading text-sm font-semibold flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-accent" />
                  Address
                </h3>
                <p className="text-sm text-muted-foreground">{store.address}</p>
              </div>
            )}

            {store.lat != null && store.lng != null && (
              <div className="rounded-2xl border border-border/60 overflow-hidden">
                <iframe
                  title="Store location"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${store.lng - 0.01},${store.lat - 0.01},${store.lng + 0.01},${store.lat + 0.01}&layer=mapnik&marker=${store.lat},${store.lng}`}
                  className="w-full h-48 border-0 block"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            )}

            <div className="rounded-2xl border border-border/60 bg-muted/10 p-5">
              <h3 className="font-heading text-sm font-semibold mb-2">Associated dermatologists</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Dermatologists who partner with this store.
              </p>
              <Link href="/dermatologists" className="text-sm text-accent hover:underline">
                Find dermatologists
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
