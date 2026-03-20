"use client";

interface StoreProfileMapProps {
  lat: number;
  lng: number;
}

export function StoreProfileMap({ lat, lng }: StoreProfileMapProps) {
  const url = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`;
  return (
    <div className="w-full h-64 rounded-lg border border-border overflow-hidden bg-muted/40">
      <iframe
        title="Store location"
        src={url}
        className="w-full h-full border-0"
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
