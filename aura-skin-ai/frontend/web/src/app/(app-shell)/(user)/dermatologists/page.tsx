"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUserLocation } from "@/hooks/useUserLocation";
import { getDermatologistsNearby, getDermatologists } from "@/services/api";
import type { Dermatologist } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Star, MapPin } from "lucide-react";

export default function DermatologistsPage() {
  const { lat, lng, loading: locLoading, allowed } = useUserLocation();
  const [dermatologists, setDermatologists] = useState<Dermatologist[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        if (allowed && !locLoading) {
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
  }, [lat, lng, allowed, locLoading]);

  return (
    <div className="space-y-8">
      <h1 className="font-heading text-2xl font-semibold">Dermatologists Near You</h1>
      <p className="text-muted-foreground">
        Find board-certified dermatologists who partner with AuraSkin AI.
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
          <CardContent className="py-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Enable location for personalized results.
            </p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl border border-border/60 bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : dermatologists.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-16 text-center">
            <User className="h-12 w-12 text-muted-foreground/60 mx-auto mb-4" />
            <p className="text-muted-foreground">No dermatologists found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {dermatologists.map((d) => (
            <Card key={d.id} className="border-border hover:shadow-[0_0_20px_rgba(229,190,181,0.15)] transition-shadow">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="w-16 h-16 shrink-0 rounded-full bg-muted/80 flex items-center justify-center">
                    <User className="h-8 w-8 text-muted-foreground/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-semibold">{d.name}</h3>
                    <p className="text-sm text-muted-foreground">{d.specialty}</p>
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
