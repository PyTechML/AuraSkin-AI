"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import "leaflet/dist/leaflet.css";

export interface LocationMapPoint {
  id: string;
  kind: "store" | "dermatologist";
  lat: number;
  lng: number;
  name: string;
  addressLine?: string;
  contact?: string;
  clinicName?: string;
  specialization?: string;
}

interface LocationsMapProps {
  points: LocationMapPoint[];
  userLat?: number;
  userLng?: number;
  className?: string;
}

const DEFAULT_MAP_CENTER: [number, number] = [21.17, 72.83];
const DEFAULT_MAP_ZOOM = 5;

function MapBoundsSync({
  points,
  userLat,
  userLng,
}: {
  points: LocationMapPoint[];
  userLat?: number;
  userLng?: number;
}) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds([]);
    for (const p of points) {
      bounds.extend([p.lat, p.lng]);
    }
    if (userLat != null && userLng != null && Number.isFinite(userLat) && Number.isFinite(userLng)) {
      bounds.extend([userLat, userLng]);
    }
    const noAnim = { animate: false as const };
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 14, ...noAnim });
    } else {
      map.setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, noAnim);
    }
    return () => {
      map.stop();
    };
  }, [map, points, userLat, userLng]);
  return null;
}

let defaultIconFixed = false;
function ensureDefaultLeafletIcon() {
  if (defaultIconFixed || typeof window === "undefined") return;
  defaultIconFixed = true;
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

export function LocationsMap({ points, userLat, userLng, className }: LocationsMapProps) {
  const [selected, setSelected] = useState<LocationMapPoint | null>(null);

  useEffect(() => {
    ensureDefaultLeafletIcon();
  }, []);

  return (
    <div className={`relative w-full min-h-[280px] h-64 md:h-80 rounded-xl overflow-hidden border border-border/60 ${className ?? ""}`}>
      <MapContainer
        center={DEFAULT_MAP_CENTER}
        zoom={DEFAULT_MAP_ZOOM}
        className="z-0 h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBoundsSync points={points} userLat={userLat} userLng={userLng} />
        {userLat != null &&
          userLng != null &&
          Number.isFinite(userLat) &&
          Number.isFinite(userLng) && (
            <Marker position={[userLat, userLng]} />
          )}
        {points.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            eventHandlers={{
              click: () => setSelected(p),
            }}
          />
        ))}
      </MapContainer>

      <AnimatePresence>
        {selected && (
          <motion.div
            key={selected.id}
            role="dialog"
            aria-label={selected.kind === "store" ? "Store details" : "Dermatologist details"}
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto absolute bottom-3 left-3 right-3 z-[500] rounded-xl border border-border/70 bg-card/95 p-4 shadow-lg backdrop-blur-sm md:left-auto md:right-4 md:max-w-sm md:min-w-[280px]"
          >
            <div className="space-y-2">
              <p className="font-heading font-semibold text-foreground">{selected.name}</p>
              {selected.kind === "store" ? (
                <>
                  {selected.addressLine ? (
                    <p className="text-sm text-muted-foreground">{selected.addressLine}</p>
                  ) : null}
                  {selected.contact ? (
                    <p className="text-sm text-muted-foreground">{selected.contact}</p>
                  ) : null}
                  <Button size="sm" className="mt-2 w-full sm:w-auto" asChild>
                    <Link href={`/stores/${selected.id}`}>View Store</Link>
                  </Button>
                </>
              ) : (
                <>
                  {selected.clinicName ? (
                    <p className="text-sm text-muted-foreground">{selected.clinicName}</p>
                  ) : null}
                  {selected.specialization ? (
                    <p className="text-sm text-muted-foreground">{selected.specialization}</p>
                  ) : null}
                  <Button size="sm" className="mt-2 w-full sm:w-auto" asChild>
                    <Link href={`/dermatologists/${selected.id}`}>View Profile</Link>
                  </Button>
                </>
              )}
            </div>
            <button
              type="button"
              className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:text-foreground"
              aria-label="Close"
              onClick={() => setSelected(null)}
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
