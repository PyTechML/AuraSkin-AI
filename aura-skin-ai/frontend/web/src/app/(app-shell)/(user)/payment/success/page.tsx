import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PaymentSuccessPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Payment successful</h1>
      <Card className="border-border">
        <CardContent className="py-10 space-y-4 text-center">
          <p className="text-muted-foreground">
            Thank you. Your order will appear in your orders list once processing completes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link href="/orders">View orders</Link>
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
