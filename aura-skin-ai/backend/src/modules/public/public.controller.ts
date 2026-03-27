import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { Request } from "express";
import { PublicService } from "./public.service";
import { formatSuccess } from "../../shared/utils/responseFormatter";
import { ContactDto, NearbyQueryDto, ProductsQueryDto } from "./public.dto";
import { AnalyticsService } from "../analytics/analytics.service";
import type { AuthenticatedUser } from "../../shared/guards/auth.guard";

@Controller()
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly analytics: AnalyticsService,
  ) {}

  @Get("products")
  async getProducts(
    @Query("skinType") skinType?: string,
    @Query("concern") concern?: string,
    @Query("brand") brand?: string,
    @Query("priceMin") priceMin?: string,
    @Query("priceMax") priceMax?: string,
    @Query("rating") rating?: string,
    @Query("sort") sort?: string
  ) {
    const filters: ProductsQueryDto = {
      skinType: skinType || undefined,
      concern: concern || undefined,
      brand: brand || undefined,
      priceMin: priceMin != null && priceMin !== "" ? parseInt(priceMin, 10) : undefined,
      priceMax: priceMax != null && priceMax !== "" ? parseInt(priceMax, 10) : undefined,
      rating: rating != null && rating !== "" ? parseFloat(rating) : undefined,
      sort: sort || undefined,
    };
    const data = await this.publicService.getProducts(filters, sort);
    // eslint-disable-next-line no-console
    console.info("[GET /api/products] count=", Array.isArray(data) ? data.length : "N/A");
    // eslint-disable-next-line no-console
    if (Array.isArray(data)) console.info("[GET /api/products] ids=", data.map((p: any) => p?.id));
    return formatSuccess(data);
  }

  @Get("products/similar/:id")
  async getSimilarProducts(@Param("id") id: string, @Query("limit") limit?: string) {
    const limitNum = limit != null && limit !== "" ? Math.min(parseInt(limit, 10) || 4, 20) : 4;
    const data = await this.publicService.getSimilarProducts(id, limitNum);
    return formatSuccess(data);
  }

  @Get("products/:id")
  async getProductById(@Param("id") id: string, @Req() req: Request) {
    const data = await this.publicService.getProductById(id);
    if (!data) throw new NotFoundException("Product not found");
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    this.analytics
      .track("product_viewed", {
        user_id: user?.id ?? null,
        entity_type: "product",
        entity_id: id,
        metadata: {},
      })
      .catch(() => {});
    return formatSuccess(data);
  }

  @Get("stores/nearby")
  async getStoresNearby(@Query("lat") latStr?: string, @Query("lng") lngStr?: string) {
    const lat = latStr != null && latStr !== "" ? parseFloat(latStr) : NaN;
    const lng = lngStr != null && lngStr !== "" ? parseFloat(lngStr) : NaN;
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      throw new BadRequestException("Query parameters lat and lng are required and must be numbers.");
    }
    const data = await this.publicService.getStoresNearby(lat, lng);
    return formatSuccess(data);
  }

  @Get("stores")
  async getStores() {
    const data = await this.publicService.getStores();
    return formatSuccess(data);
  }

  @Get("stores/:id")
  async getStoreById(@Param("id") id: string) {
    const data = await this.publicService.getStoreById(id);
    if (!data) throw new NotFoundException("Store not found");
    return formatSuccess(data);
  }

  @Get("stores/:id/products")
  async getStoreProducts(@Param("id") id: string) {
    const data = await this.publicService.getStoreProducts(id);
    return formatSuccess(data);
  }

  @Get("dermatologists/nearby")
  async getDermatologistsNearby(@Query("lat") latStr?: string, @Query("lng") lngStr?: string) {
    const lat = latStr != null && latStr !== "" ? parseFloat(latStr) : NaN;
    const lng = lngStr != null && lngStr !== "" ? parseFloat(lngStr) : NaN;
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      throw new BadRequestException("Query parameters lat and lng are required and must be numbers.");
    }
    const data = await this.publicService.getDermatologistsNearby(lat, lng);
    return formatSuccess(data);
  }

  @Get("dermatologists")
  async getDermatologists() {
    const data = await this.publicService.getDermatologists();
    return formatSuccess(data);
  }

  @Get("dermatologists/:id")
  async getDermatologistById(@Param("id") id: string) {
    const data = await this.publicService.getDermatologistById(id);
    if (!data) throw new NotFoundException("Dermatologist not found");
    return formatSuccess(data);
  }

  @Get("blogs")
  async getBlogs() {
    const data = await this.publicService.getBlogs();
    return formatSuccess(data);
  }

  @Get("blogs/:slug")
  async getBlogBySlug(@Param("slug") slug: string) {
    const data = await this.publicService.getBlogBySlug(slug);
    if (!data) throw new NotFoundException("Blog not found");
    return formatSuccess(data);
  }

  @Get("faq")
  async getFaq() {
    const data = await this.publicService.getFaq();
    return formatSuccess(data);
  }

  @Post("contact")
  async submitContact(@Body() body: ContactDto) {
    const ok = await this.publicService.submitContact({
      name: body.name,
      email: body.email,
      subject: body.subject,
      message: body.message,
    });
    if (!ok) throw new BadRequestException("Failed to submit contact message.");
    return formatSuccess({ success: true }, "Message sent successfully.");
  }

  @Get("dermatologists/:id/slots")
  async getDermatologistSlots(@Param("id") id: string) {
    const data = await this.publicService.getDermatologistSlots(id);
    return formatSuccess(data);
  }
}
