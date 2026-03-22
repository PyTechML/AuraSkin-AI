"use client";

import Link from "next/link";
import { Breadcrumb } from "@/components/layouts/Breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ShoppingBag } from "lucide-react";

export default function StoreWithdrawalsPage() {
  return (
    <div className="space-y-8 pb-12">
      <Breadcrumb />

      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold">
          Withdrawals (coming soon)
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Payouts and withdrawals will be enabled in a future release. Order
          revenue and delivered sales appear on your store dashboard; they are
          not a bank balance or withdrawable amount until settlement and
          withdrawals are supported.
        </p>
      </div>

      <Card className="border-border max-w-xl">
        <CardHeader>
          <CardTitle className="font-heading text-base">
            Where to see revenue
          </CardTitle>
          <CardDescription>
            Use these areas to track sales and fulfillment today.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/store/dashboard" className="inline-flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Store dashboard
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/store/orders" className="inline-flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Orders
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
