"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useUserLocation } from "@/hooks/useUserLocation";
import { getDermatologistsNearby, getDermatologists } from "@/services/api";
import { isDocumentVisible, PANEL_LIVE_POLL_INTERVAL_MS, takeFreshList } from "@/lib/panelPolling";
import type { Dermatologist } from "@/types";
import type { LocationMapPoint } from "@/components/stores/LocationsMap";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Star, MapPin } from "lucide-react";

const LocationsMap = dynamic(
  () => import("@/components/stores/LocationsMap").then((m) => m.LocationsMap),
  { ssr: false, loading: () => <div className="w-full h-64 bg-muted/40 rounded-xl animate-pulse" /> }
);

export default function DermatologistsPage() {
  const {
    lat,
    lng,
    loading: locLoading,
    allowed,
    hasAccurateLocation,
    refresh,
  } = useUserLocation();
  const [dermatologists, setDermatologists] = useState<Dermatologist[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        if (hasAccurateLocation && allowed && !locLoading) {
          const nearby = await getDermatologistsNearby(lat, lng);
          setDermatologists(nearby);
        } else {
          const all = await getDermatologists();
          setDermatologists(all);
        }
      } catch {
        setLoadError("Unable to load dermatologists. Please try again.");
        setDermatologists([]);
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
          ? getDermatologistsNearby(lat, lng)
          : getDermatologists();
      fetcher
        .then((fresh) => {
          setDermatologists((prev) => takeFreshList(prev, Array.isArray(fresh) ? fresh : []));
        })
        .catch(() => {});
    }, PANEL_LIVE_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [lat, lng, allowed, hasAccurateLocation, locLoading]);

  const mapPoints = useMemo((): LocationMapPoint[] => {
    return (Array.isArray(dermatologists) ? dermatologists : [])
      .filter(
        (d) =>
          typeof d.clinicLat === "number" &&
          Number.isFinite(d.clinicLat) &&
          typeof d.clinicLng === "number" &&
          Number.isFinite(d.clinicLng)
      )
      .map((d) => {
        const clinicName =
          d.clinicAddress?.split(",")[0]?.trim() || d.clinicAddress || undefined;
        return {
          id: d.id,
          kind: "dermatologist" as const,
          lat: d.clinicLat as number,
          lng: d.clinicLng as number,
          name: d.name ?? "Dermatologist",
          clinicName,
          specialization: d.specialty,
          addressLine: d.clinicAddress,
        };
      });
  }, [dermatologists]);
  const visibleDermatologists = useMemo(
    () => dermatologists.filter((d) => typeof d.id === "string" && d.id.trim().length > 0),
    [dermatologists]
  );

  return (
    <div className="space-y-8 mx-auto w-full max-w-7xl">
      <h1 className="font-heading text-2xl font-semibold">Dermatologists Near You</h1>
      <p className="text-muted-foreground">
        Find board-certified dermatologists who partner with AuraSkin AI.
      </p>

      <div className="rounded-2xl border border-border/60 overflow-hidden">
        <div className="p-0">
          <LocationsMap
            points={mapPoints}
            userLat={hasAccurateLocation ? lat : undefined}
            userLng={hasAccurateLocation ? lng : undefined}
            className="h-[360px] md:h-[460px]"
          />
        </div>
      </div>

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

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl border border-border/60 bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : visibleDermatologists.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-16 text-center">
            <User className="h-12 w-12 text-muted-foreground/60 mx-auto mb-4" />
            <p className="text-muted-foreground">No dermatologists found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleDermatologists.map((d) => (
            <Card key={d.id} className="border-border hover:shadow-[0_0_20px_rgba(229,190,181,0.15)] transition-shadow">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {d.photoUrl ? (
                    <img
                      src={d.photoUrl}
                      alt={d.name ?? "Dermatologist"}
                      className="w-16 h-16 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 shrink-0 rounded-full bg-muted/80 flex items-center justify-center">
                      <User className="h-8 w-8 text-muted-foreground/60" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-semibold">
                      {d.name?.trim() ? d.name : "Dermatologist"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {d.specialty?.trim() ? d.specialty : "General Dermatology"}
                    </p>
                    {d.yearsExperience != null && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {d.yearsExperience}+ years experience
                      </p>
                    )}
                    {d.rating != null && (
                      <p className="text-sm flex items-center gap-1 mt-1">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        {d.rating}
                      </p>
                    )}
                    {d.distance != null && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-4 w-4" />
                        {d.distance.toFixed(1)} km away
                      </p>
                    )}
                    {d.availability ? (
                      <p className="text-xs text-muted-foreground mt-1">{d.availability}</p>
                    ) : null}
                    {d.bio ? (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.bio}</p>
                    ) : null}
                    <Button variant="outline" size="sm" className="mt-3" asChild>
                      <Link href={`/dermatologists/${d.id}`}>View Profile</Link>
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
