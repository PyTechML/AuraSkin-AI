import { getProducts } from "@/services/api";
import { ProductsPageContent } from "@/components/products/ProductsPageContent";

export default async function ProductsPage() {
  const products = await getProducts();

  return <ProductsPageContent products={products} />;
}
