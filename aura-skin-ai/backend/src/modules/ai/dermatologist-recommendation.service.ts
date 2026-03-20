import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../database/supabase.client";
import type { DbDermatologistProfile } from "../../database/models";

export interface DermatologistRecommendationInput {
  user_city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface RankedDermatologist extends DbDermatologistProfile {
  distance_km: number | null;
}

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

@Injectable()
export class AiDermatologistRecommendationService {
  async getNearestDermatologists(
    input: DermatologistRecommendationInput,
    limit = 5
  ): Promise<RankedDermatologist[]> {
    const supabase = getSupabaseClient();

    let query = supabase
      .from("dermatologist_profiles")
      .select("*")
      .limit(limit * 4);

    if (input.user_city && input.user_city.trim()) {
      query = query.ilike("city", input.user_city.trim());
    }

    const { data, error } = await query;
    if (error || !data) return [];

    const list = data as DbDermatologistProfile[];

    const withDistance = list.map((d) => {
      const lat = d.latitude;
      const lng = d.longitude;
      if (
        lat != null &&
        lng != null &&
        input.latitude != null &&
        input.longitude != null
      ) {
        const distance = haversineDistanceKm(
          input.latitude,
          input.longitude,
          lat,
          lng
        );
        return {
          ...d,
          distance_km: Math.round(distance * 100) / 100,
        };
      }
      return { ...d, distance_km: null };
    });

    return withDistance
      .sort((a, b) => {
        const aD = a.distance_km ?? 999999;
        const bD = b.distance_km ?? 999999;
        return aD - bD;
      })
      .slice(0, limit);
  }
}

