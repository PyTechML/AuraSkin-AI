import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../../database/supabase.client";
import type { DbStoreProfile, DbStoreNotification } from "../../../../database/models";

export interface CreateStoreProfileRow {
  id: string;
  store_name?: string | null;
  store_description?: string | null;
  address?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  contact_number?: string | null;
  logo_url?: string | null;
}

export interface UpdateStoreProfileRow {
  store_name?: string | null;
  store_description?: string | null;
  address?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  contact_number?: string | null;
  logo_url?: string | null;
}

@Injectable()
export class StoreRepository {
  async getProfileById(id: string): Promise<DbStoreProfile | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("store_profiles")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return data as DbStoreProfile;
  }

  async createProfile(row: CreateStoreProfileRow): Promise<DbStoreProfile | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("store_profiles")
      .insert({
        id: row.id,
        store_name: row.store_name ?? null,
        store_description: row.store_description ?? null,
        address: row.address ?? null,
        city: row.city ?? null,
        latitude: row.latitude ?? null,
        longitude: row.longitude ?? null,
        contact_number: row.contact_number ?? null,
        logo_url: row.logo_url ?? null,
      })
      .select()
      .single();
    if (error || !data) return null;
    return data as DbStoreProfile;
  }

  async updateProfile(id: string, row: UpdateStoreProfileRow): Promise<DbStoreProfile | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("store_profiles")
      .update({
        ...row,
        store_name: row.store_name ?? undefined,
        store_description: row.store_description ?? undefined,
        address: row.address ?? undefined,
        city: row.city ?? undefined,
        latitude: row.latitude ?? undefined,
        longitude: row.longitude ?? undefined,
        contact_number: row.contact_number ?? undefined,
        logo_url: row.logo_url ?? undefined,
      })
      .eq("id", id)
      .select()
      .single();
    if (error || !data) return null;
    return data as DbStoreProfile;
  }

  async getNotificationsByStoreId(storeId: string): Promise<DbStoreNotification[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("store_notifications")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data as DbStoreNotification[]) ?? [];
  }

  async markNotificationRead(id: string, storeId: string): Promise<DbStoreNotification | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("store_notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("store_id", storeId)
      .select()
      .single();
    if (error || !data) return null;
    return data as DbStoreNotification;
  }

  async createNotification(storeId: string, type: string, message: string): Promise<DbStoreNotification | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("store_notifications")
      .insert({ store_id: storeId, type, message })
      .select()
      .single();
    if (error || !data) return null;
    return data as DbStoreNotification;
  }
}
