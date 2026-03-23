"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useUserLocation } from "@/hooks/useUserLocation";
import { getStoresNearby, getStores } from "@/services/api";
import type { PublicStore } from "@/types/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Star } from "lucide-react";
import dynamic from "next/dynamic";

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
          name: s.name ?? "Store",
          addressLine: s.location || s.address,
          contact: s.contact,
        })),
    [stores]
  );

  return (
    <div className="space-y-8">
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

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-6">
            <LocationsMap
              points={mapPoints}
              userLat={hasAccurateLocation ? lat : undefined}
              userLng={hasAccurateLocation ? lng : undefined}
            />
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 rounded-xl border border-border/60 bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : stores.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-12 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground/60 mx-auto mb-4" />
                <p className="text-muted-foreground">No stores available yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {stores.map((store) => (
                <Card key={store.id} className="border-border hover:shadow-[0_0_20px_rgba(229,190,181,0.15)] transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 shrink-0 rounded-xl bg-muted/80 flex items-center justify-center">
                        <MapPin className="h-8 w-8 text-muted-foreground/60" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-heading font-semibold">{store.name ?? "Store"}</h3>
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
      </div>
    </div>
  );
}
