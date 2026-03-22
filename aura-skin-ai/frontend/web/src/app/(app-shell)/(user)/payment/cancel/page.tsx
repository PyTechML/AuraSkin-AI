import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PaymentCancelPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Checkout cancelled</h1>
      <Card className="border-border">
        <CardContent className="py-10 space-y-4 text-center">
          <p className="text-muted-foreground">
            No payment was taken. You can return to your cart or keep browsing.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link href="/cart">Back to cart</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/shop">Continue shopping</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
