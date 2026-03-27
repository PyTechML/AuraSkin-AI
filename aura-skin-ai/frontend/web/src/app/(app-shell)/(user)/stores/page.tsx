"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useUserLocation } from "@/hooks/useUserLocation";
import { getStoresNearby, getStores } from "@/services/api";
import type { PublicStore } from "@/types/store";
import { isDocumentVisible, PANEL_LIVE_POLL_INTERVAL_MS, takeFreshList } from "@/lib/panelPolling";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Star } from "lucide-react";
import dynamic from "next/dynamic";

const UUID_LIKE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function readableStoreName(name: string | null | undefined): string {
  const value = typeof name === "string" ? name.trim() : "";
  if (!value || UUID_LIKE_RE.test(value)) return "Store";
  return value;
}

const LocationsMap = dynamic(
  () => import("@/components/stores/LocationsMap").then((m) => m.LocationsMap),
  { ssr: false, loading: () => <div className="w-full h-64 bg-muted/40 rounded-xl animate-pulse" /> }
);

export default function StoresPage() {
  const {
    lat,
    lng,
    loading: locLoading,
    allowed,
    hasAccurateLocation,
    refresh,
  } = useUserLocation();
  const [stores, setStores] = useState<PublicStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        if (hasAccurateLocation && allowed && !locLoading) {
          const nearby = await getStoresNearby(lat, lng);
          setStores(nearby);
        } else {
          const all = await getStores();
          setStores(all);
        }
      } catch {
        setLoadError("Unable to load stores. Please try again.");
        setStores([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [lat, lng, allowed, hasAccurateLocation, locLoading]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!isDocumentVisible()) return;
      const fetcher =
        hasAccurateLocation && allowed && !locLoading
          ? getStoresNearby(lat, lng)
          : getStores();
      fetcher
        .then((fresh) => {
          setStores((prev) => takeFreshList(prev, Array.isArray(fresh) ? fresh : []));
        })
        .catch(() => {});
    }, PANEL_LIVE_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [lat, lng, allowed, hasAccurateLocation, locLoading]);

  const mapPoints = useMemo(
    () =>
      stores
        .filter(
          (s) =>
            typeof s.lat === "number" &&
            Number.isFinite(s.lat) &&
            typeof s.lng === "number" &&
            Number.isFinite(s.lng)
        )
        .map((s) => ({
          id: s.id,
          kind: "store" as const,
          lat: s.lat as number,
          lng: s.lng as number,
          name: readableStoreName(s.name),
          addressLine: s.location || s.address,
          contact: s.contact,
        })),
    [stores]
  );
  const visibleStores = useMemo(
    () => stores.filter((s) => String(s.status ?? "active").toLowerCase() === "active"),
    [stores]
  );

  return (
    <div className="space-y-8 mx-auto w-full max-w-7xl">
      <h1 className="font-heading text-2xl font-semibold">Stores Near You</h1>
      <p className="text-muted-foreground">
        Find AuraSkin partner stores and pharmacies near your location.
      </p>

      {loadError && (
        <Card className="border-border">
          <CardContent className="py-6 text-center space-y-3">
            <p className="text-muted-foreground">{loadError}</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {allowed === false && !locLoading && !loadError && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-4 flex items-center justify-between gap-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Enable location for personalized results.
            </p>
            <Button variant="outline" size="sm" onClick={refresh}>
              Enable location
            </Button>
          </CardContent>
        </Card>
      )}

      <LocationsMap
        points={mapPoints}
        userLat={hasAccurateLocation ? lat : undefined}
        userLng={hasAccurateLocation ? lng : undefined}
        className="h-[360px] md:h-[460px]"
      />

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 rounded-xl border border-border/60 bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : visibleStores.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground/60 mx-auto mb-4" />
            <p className="text-muted-foreground">No stores available yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visibleStores.map((store) => (
            <Card key={store.id} className="border-border hover:shadow-[0_0_20px_rgba(229,190,181,0.15)] transition-shadow">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {store.imageUrl ? (
                    <img
                      src={store.imageUrl}
                      alt={readableStoreName(store.name)}
                      className="w-24 h-24 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 shrink-0 rounded-xl bg-muted/80 flex items-center justify-center">
                      <MapPin className="h-8 w-8 text-muted-foreground/60" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-semibold">{readableStoreName(store.name)}</h3>
                    {store.location ? (
                      <p className="text-sm text-muted-foreground">{store.location}</p>
                    ) : null}
                    {Number.isFinite(store.totalProducts) && store.totalProducts > 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {store.totalProducts} product{store.totalProducts === 1 ? "" : "s"}
                      </p>
                    ) : null}
                    {store.rating != null && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        {store.rating}
                      </p>
                    )}
                    {store.distance != null && (
                      <p className="text-sm text-muted-foreground">
                        {store.distance.toFixed(1)} km away
                      </p>
                    )}
                    {store.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {store.description}
                      </p>
                    )}
                    {store.contact ? (
                      <p className="text-sm text-muted-foreground mt-1">{store.contact}</p>
                    ) : null}
                    <Button variant="outline" size="sm" className="mt-3" asChild>
                      <Link href={`/stores/${store.id}`}>View Store</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
