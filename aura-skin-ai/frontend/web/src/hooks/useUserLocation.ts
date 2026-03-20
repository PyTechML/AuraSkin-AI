"use client";

import { useState, useEffect, useCallback } from "react";

const DEFAULT_LAT = 37.785;
const DEFAULT_LNG = -122.42;

interface LocationState {
  lat: number;
  lng: number;
  loading: boolean;
  allowed: boolean | null;
  error: string | null;
  hasAccurateLocation: boolean;
}

export function useUserLocation(): LocationState & { refresh: () => void } {
  const [state, setState] = useState<LocationState>({
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
    loading: true,
    allowed: null,
    error: null,
    hasAccurateLocation: false,
  });

  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({
        ...s,
        loading: false,
        allowed: false,
        error: "Geolocation not supported",
        hasAccurateLocation: false,
      }));
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null, hasAccurateLocation: false }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          loading: false,
          allowed: true,
          error: null,
          hasAccurateLocation: true,
        });
      },
      () => {
        setState({
          lat: DEFAULT_LAT,
          lng: DEFAULT_LNG,
          loading: false,
          allowed: false,
          error: "Location access denied",
          hasAccurateLocation: false,
        });
      },
      { timeout: 2000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  return { ...state, refresh: fetchLocation };
}
