import { Injectable, BadRequestException } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import { PayoutsRepository } from "../repositories/payouts.repository";
import { PaymentAuditRepository } from "../repositories/payment-audit.repository";
import { StripeService } from "./stripe.service";

const PLATFORM_FEE_PERCENT = 10;

@Injectable()
export class PayoutsService {
  constructor(
    private readonly payoutsRepository: PayoutsRepository,
    private readonly paymentAuditRepository: PaymentAuditRepository,
    private readonly stripeService: StripeService
  ) {}

  async triggerStorePayout(storeId: string): Promise<{ payout_id: string; amount: number } | null> {
    const stripe = this.stripeService.getClient();
    const supabase = getSupabaseClient();
    const { data: orders } = await supabase
      .from("orders")
      .select("id, total_amount")
      .eq("store_id", storeId)
      .eq("payment_status", "completed")
      .eq("order_status", "confirmed");

    const total = (orders ?? []).reduce(
      (sum: number, o: { total_amount?: number }) => sum + Number(o.total_amount ?? 0),
      0
    );
    const fee = (total * PLATFORM_FEE_PERCENT) / 100;
    const amount = Math.round((total - fee) * 100) / 100;
    if (amount <= 0) {
      throw new BadRequestException("No payout amount for this store");
    }

    const payout = await this.payoutsRepository.create({
      recipient_id: storeId,
      recipient_type: "store",
      amount,
      payout_status: "pending",
    });
    if (!payout) return null;

    const stripeAccountId = await this.getStoreStripeAccountId(storeId);
    if (stripeAccountId) {
      try {
        const transfer = await stripe.transfers.create({
          amount: Math.round(amount * 100),
          currency: "usd",
          destination: stripeAccountId,
        });
        await this.payoutsRepository.updatePayoutStatus(
          payout.id,
          "paid",
          transfer.id
        );
      } catch (err) {
        await this.paymentAuditRepository.log("payout.transfer_failed", {
          payout_id: payout.id,
          store_id: storeId,
          error: (err as Error).message,
        });
      }
    }

    await this.paymentAuditRepository.log("payout.triggered", {
      payout_id: payout.id,
      store_id: storeId,
      amount,
    });
    return { payout_id: payout.id, amount };
  }

  private async getStoreStripeAccountId(storeId: string): Promise<string | null> {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from("store_profiles")
      .select("stripe_account_id")
      .eq("id", storeId)
      .single();
    const row = data as { stripe_account_id?: string } | null;
    return row?.stripe_account_id ?? null;
  }
}
