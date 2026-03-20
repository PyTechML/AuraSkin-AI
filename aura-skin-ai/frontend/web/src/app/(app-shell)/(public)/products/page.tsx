import { getProducts } from "@/services/api";
import { ProductsPageContent } from "@/components/products/ProductsPageContent";

export default async function ProductsPage() {
  const products = await getProducts();
  // eslint-disable-next-line no-console
  console.log("RENDER PRODUCTS:", products);

  return <ProductsPageContent products={products} />;
}
