import { Injectable } from "@nestjs/common";
import { PublicRepository, type ProductFilters, type PublicStoreProfileRow, type PublicDermatologistRow } from "./public.repository";
import type { DbProduct, DbBlog, DbFaq } from "../../database/models";

/** API response shapes (camelCase) for frontend compatibility. */
export interface ProductResponse {
  id: string;
  name: string;
  description: string;
  category: string;
  storeId?: string;
  imageUrl?: string;
  fullDescription?: string;
  keyIngredients?: string[];
  usage?: string;
  safetyNotes?: string;
  price?: number;
  brand?: string;
  rating?: number;
  skinType?: string[];
  concern?: string[];
}

export interface StoreResponse {
  id: string;
  name: string;
  location: string;
  status: string;
  address?: string;
  lat?: number;
  lng?: number;
  description?: string;
  imageUrl?: string;
  rating?: number;
  openingHours?: string;
  contact?: string;
  distance?: number;
  /** Approved inventory rows linked to LIVE products for this store. */
  totalProducts: number;
}

export interface DermatologistResponse {
  id: string;
  name: string;
  specialty: string;
  email: string;
  yearsExperience?: number;
  rating?: number;
  distance?: number;
  clinicAddress?: string;
  clinicLat?: number;
  clinicLng?: number;
  consultationFee?: number;
  timeSlots?: string[];
  photoUrl?: string;
  bio?: string;
  availability?: string;
}

export interface BlogResponse {
  id: string;
  title: string;
  slug: string;
  content?: string;
  coverImage?: string;
  summary?: string;
  category?: string;
  createdAt?: string;
}

export interface FaqResponse {
  question: string;
  answer: string;
}

function mapProduct(row: DbProduct, storeId?: string | null): ProductResponse {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    category: row.category ?? "",
    storeId: storeId ?? undefined,
    imageUrl: row.image_url,
    fullDescription: row.full_description,
    keyIngredients: row.key_ingredients,
    usage: row.usage,
    safetyNotes: row.safety_notes,
    price: row.price != null ? Number(row.price) : undefined,
    brand: row.brand,
    rating: row.rating != null ? Number(row.rating) : undefined,
    skinType: row.skin_type,
    concern: row.concern,
  };
}

function mapStoreProfile(row: PublicStoreProfileRow): StoreResponse {
  const total = row.totalProducts;
  const totalProducts = Number.isFinite(total) ? total : 0;
  const safeName =
    typeof row.store_name === "string" && row.store_name.trim().length > 0
      ? row.store_name.trim()
      : "Store";
  const safeLocation =
    typeof row.city === "string" && row.city.trim().length > 0
      ? row.city.trim()
      : typeof row.address === "string" && row.address.trim().length > 0
      ? row.address.trim()
      : "Location not provided";
  return {
    id: row.id,
    name: safeName,
    location: safeLocation,
    status: "Active",
    address: row.address ?? undefined,
    lat: row.latitude != null ? Number(row.latitude) : undefined,
    lng: row.longitude != null ? Number(row.longitude) : undefined,
    description: row.store_description ?? undefined,
    imageUrl: row.logo_url ?? undefined,
    contact: row.contact_number ?? undefined,
    totalProducts,
  };
}

function mapDermatologist(row: PublicDermatologistRow): DermatologistResponse {
  const fallbackClinicAddress = [row.clinic_name, row.city].filter(Boolean).join(", ");
  const clinicAddress = (row.clinic_address ?? fallbackClinicAddress) || undefined;
  return {
    id: row.id,
    name: row.name,
    specialty: row.specialization ?? "",
    email: row.email ?? "",
    yearsExperience: row.years_experience ?? undefined,
    rating: row.rating != null ? Number(row.rating) : undefined,
    clinicAddress,
    clinicLat: row.latitude != null ? Number(row.latitude) : undefined,
    clinicLng: row.longitude != null ? Number(row.longitude) : undefined,
    consultationFee: row.consultation_fee != null ? Number(row.consultation_fee) : undefined,
    photoUrl: row.profile_image ?? undefined,
    bio: row.bio ?? undefined,
    availability: row.availability ?? undefined,
  };
}

function mapBlog(row: DbBlog): BlogResponse {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    content: row.content,
    coverImage: row.cover_image,
    summary: row.summary,
    category: row.category,
    createdAt: row.created_at,
  };
}

function mapFaq(row: DbFaq): FaqResponse {
  return { question: row.question, answer: row.answer };
}

/** Approximate km distance (Haversine-style approximation for sorting). */
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

@Injectable()
export class PublicService {
  constructor(private readonly repo: PublicRepository) {}

  async getProducts(filters?: ProductFilters, sort?: string): Promise<ProductResponse[]> {
    const rows = await this.repo.getProducts(filters, sort);
    return rows.map((r) => mapProduct(r));
  }

  async getProductById(id: string): Promise<ProductResponse | null> {
    const row = await this.repo.getProductById(id);
    if (!row) return null;
    const storeId = await this.repo.getPrimaryStoreIdForProduct(id);
    return mapProduct(row, storeId);
  }

  async getSimilarProducts(productId: string, limit: number): Promise<ProductResponse[]> {
    const product = await this.repo.getProductById(productId);
    if (!product?.category) return [];
    const rows = await this.repo.getProductsByCategory(product.category, productId, limit);
    return rows.map((r) => mapProduct(r));
  }

  async getStores(): Promise<StoreResponse[]> {
    const rows = await this.repo.getStores();
    return rows.map(mapStoreProfile);
  }

  async getStoresNearby(lat: number, lng: number): Promise<StoreResponse[]> {
    const rows = await this.repo.getStores();
    const mapped = rows.map((s) => {
      const item = mapStoreProfile(s);
      if (s.latitude != null && s.longitude != null) {
        item.distance = Math.round(distanceKm(lat, lng, Number(s.latitude), Number(s.longitude)) * 10) / 10;
      }
      return item;
    });
    return mapped.sort((a, b) => (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY));
  }

  async getStoreById(id: string): Promise<StoreResponse | null> {
    const row = await this.repo.getStoreById(id);
    return row ? mapStoreProfile(row) : null;
  }

  async getStoreProducts(id: string): Promise<ProductResponse[]> {
    const rows = await this.repo.getStoreProducts(id);
    return rows.map((r) => mapProduct(r, id));
  }

  async getDermatologists(): Promise<DermatologistResponse[]> {
    const rows = await this.repo.getDermatologists();
    return rows.map(mapDermatologist);
  }

  async getDermatologistsNearby(lat: number, lng: number): Promise<DermatologistResponse[]> {
    const rows = await this.repo.getDermatologists();
    const mapped = rows.map((d) => {
      const item = mapDermatologist(d);
      if (d.latitude != null && d.longitude != null) {
        item.distance = Math.round(distanceKm(lat, lng, Number(d.latitude), Number(d.longitude)) * 10) / 10;
      }
      return item;
    });
    return mapped.sort((a, b) => (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY));
  }

  async getDermatologistById(id: string): Promise<DermatologistResponse | null> {
    const row = await this.repo.getDermatologistById(id);
    return row ? mapDermatologist(row) : null;
  }

  async getBlogs(): Promise<BlogResponse[]> {
    const rows = await this.repo.getBlogs();
    return rows.map(mapBlog);
  }

  async getBlogBySlug(slug: string): Promise<BlogResponse | null> {
    const row = await this.repo.getBlogBySlug(slug);
    return row ? mapBlog(row) : null;
  }

  async getFaq(): Promise<FaqResponse[]> {
    const rows = await this.repo.getFaq();
    return rows.map(mapFaq);
  }

  async submitContact(payload: { name: string; email: string; subject?: string; message: string }): Promise<boolean> {
    const inserted = await this.repo.insertContactMessage(payload);
    return inserted != null;
  }

  async getDermatologistSlots(dermatologistId: string): Promise<any[]> {
    return this.repo.getDermatologistSlots(dermatologistId);
  }
}
