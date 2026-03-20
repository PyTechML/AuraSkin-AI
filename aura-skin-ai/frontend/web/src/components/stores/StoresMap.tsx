"use client";

import type { Store } from "@/types";

interface StoresMapProps {
  stores: Store[];
  userLat?: number;
  userLng?: number;
}

export function StoresMap({ stores, userLat, userLng }: StoresMapProps) {
  const padding = 0.02;
  const hasUser =
    typeof userLat === "number" &&
    Number.isFinite(userLat) &&
    typeof userLng === "number" &&
    Number.isFinite(userLng);

  const storeCoords = stores.filter(
    (s) =>
      typeof s.lat === "number" &&
      Number.isFinite(s.lat) &&
      typeof s.lng === "number" &&
      Number.isFinite(s.lng)
  );

  let minLat: number;
  let maxLat: number;
  let minLng: number;
  let maxLng: number;
  let marker: string | null = null;

  if (storeCoords.length > 0 || hasUser) {
    const lats: number[] = [];
    const lngs: number[] = [];

    if (storeCoords.length > 0) {
      lats.push(...storeCoords.map((s) => s.lat as number));
      lngs.push(...storeCoords.map((s) => s.lng as number));
    }

    if (hasUser) {
      lats.push(userLat as number);
      lngs.push(userLng as number);
      marker = `${userLat},${userLng}`;
    } else if (storeCoords.length > 0) {
      const first = storeCoords[0];
      marker = `${first.lat},${first.lng}`;
    }

    const baseMinLat = Math.min(...lats);
    const baseMaxLat = Math.max(...lats);
    const baseMinLng = Math.min(...lngs);
    const baseMaxLng = Math.max(...lngs);

    minLat = baseMinLat - padding;
    maxLat = baseMaxLat + padding;
    minLng = baseMinLng - padding;
    maxLng = baseMaxLng + padding;
  } else {
    const centerLat = 0;
    const centerLng = 0;
    minLat = centerLat - padding;
    maxLat = centerLat + padding;
    minLng = centerLng - padding;
    maxLng = centerLng + padding;
    marker = null;
  }

  const bbox = `${minLng},${minLat},${maxLng},${maxLat}`;
  const baseUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox
  )}&layer=mapnik`;
  const src = marker
    ? `${baseUrl}&marker=${encodeURIComponent(marker)}`
    : baseUrl;

  return (
    <div className="aspect-video w-full min-h-[256px] bg-muted/40">
      <iframe
        title="Stores map"
        src={src}
        className="w-full h-full min-h-[256px] border-0 block"
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
