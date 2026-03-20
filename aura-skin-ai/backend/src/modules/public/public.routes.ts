/**
 * Public module route path constants for documentation and frontend alignment.
 * All paths are under global prefix "api", e.g. GET /api/products.
 */

export const PUBLIC_ROUTES = {
  PRODUCTS: "/api/products",
  PRODUCT_BY_ID: "/api/products/:id",
  PRODUCT_SIMILAR: "/api/products/similar/:id",
  STORES: "/api/stores",
  STORES_NEARBY: "/api/stores/nearby",
  STORE_BY_ID: "/api/stores/:id",
  DERMATOLOGISTS: "/api/dermatologists",
  DERMATOLOGISTS_NEARBY: "/api/dermatologists/nearby",
  DERMATOLOGIST_BY_ID: "/api/dermatologists/:id",
  BLOGS: "/api/blogs",
  BLOG_BY_SLUG: "/api/blogs/:slug",
  FAQ: "/api/faq",
  CONTACT: "/api/contact",
} as const;
