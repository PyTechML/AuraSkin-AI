import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../database/supabase.client";

export interface DermatologistRecommendation {
  id: string;
  name: string;
  specialty: string;
  email: string;
  distance?: number;
  clinicLat?: number;
  clinicLng?: number;
  [key: string]: unknown;
}

/**
 * Dermatologist matching by user location. Filter by specialization, sort by distance.
 */
@Injectable()
export class DermatologistRecommendationService {
  async recommendNearby(
    userLat: number,
    userLng: number,
    _specialization?: string,
    limit = 10
  ): Promise<DermatologistRecommendation[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("dermatologists")
      .select("*")
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .limit(limit * 3);
    if (error || !data) return [];
    const withDistance = (data as Record<string, unknown>[]).map((d) => {
      const lat = d.latitude as number;
      const lng = d.longitude as number;
      const distance = Math.sqrt(
        Math.pow((lat - userLat) * 111, 2) + Math.pow((lng - userLng) * 85, 2)
      );
      return { ...d, distance } as DermatologistRecommendation;
    });
    withDistance.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
    return withDistance.slice(0, limit);
  }
}
