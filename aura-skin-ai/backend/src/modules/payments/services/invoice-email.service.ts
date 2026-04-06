import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";

export interface InvoiceItem {
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface SendInvoicePayload {
  orderId: string;
  customerEmail: string;
  customerName: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  totalAmount: number;
  paymentMethod: string;
  transactionId: string;
  shippingAddress: string;
  purchaseDate: Date;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: "Credit / Debit Card",
  bank_transfer: "Bank Transfer",
  cod: "Cash on Delivery",
};

@Injectable()
export class InvoiceEmailService {
  private readonly logger = new Logger(InvoiceEmailService.name);

  async sendOrderInvoice(payload: SendInvoicePayload): Promise<void> {
    const host = process.env.SMTP_HOST?.trim();
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    const from = process.env.SMTP_FROM?.trim();
    const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
    const secure = process.env.SMTP_SECURE?.trim().toLowerCase() === "true";

    if (!host || !user || !pass || !from) {
      this.logger.warn(
        "SMTP not configured — skipping invoice email for order " +
          payload.orderId.slice(0, 8)
      );
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    const shortOrderId = payload.orderId.slice(0, 8).toUpperCase();
    const shortTxnId = payload.transactionId
      ? payload.transactionId.slice(0, 27)
      : "N/A";
    const methodLabel =
      PAYMENT_METHOD_LABELS[payload.paymentMethod] ?? payload.paymentMethod;
    const dateStr = payload.purchaseDate.toLocaleString("en-US", {
      dateStyle: "long",
      timeStyle: "short",
    });

    const itemsHtml = payload.items
      .map(
        (item) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f0e6ef;font-size:14px;color:#333">${escapeHtml(item.productName)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0e6ef;font-size:14px;color:#333;text-align:center">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0e6ef;font-size:14px;color:#333;text-align:right">$${item.unitPrice.toFixed(2)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0e6ef;font-size:14px;color:#333;text-align:right">$${(item.unitPrice * item.quantity).toFixed(2)}</td>
      </tr>`
      )
      .join("");

    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf5f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;margin-top:24px;margin-bottom:24px;box-shadow:0 2px 12px rgba(190,130,170,0.10)">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#d4628e 0%,#e8a0bf 100%);padding:32px 24px;text-align:center">
      <h1 style="margin:0;font-size:28px;color:#fff;font-weight:700;letter-spacing:0.5px">AuraSkin AI</h1>
      <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.85)">Your Personalized Skincare Journey</p>
    </div>

    <!-- Order Confirmed Badge -->
    <div style="text-align:center;padding:28px 24px 8px">
      <div style="display:inline-block;background:#ecfdf5;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:28px">&#10003;</div>
      <h2 style="margin:12px 0 4px;font-size:22px;color:#16a34a;font-weight:700">Order Confirmed!</h2>
      <p style="margin:0;font-size:14px;color:#6b7280">Thank you for your purchase, ${escapeHtml(payload.customerName)}.</p>
    </div>

    <!-- Order Details -->
    <div style="padding:20px 24px">
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#555">
        <tr>
          <td style="padding:6px 0;font-weight:600;color:#333">Order ID</td>
          <td style="padding:6px 0;text-align:right;font-family:monospace;font-size:13px;color:#d4628e">${shortOrderId}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-weight:600;color:#333">Transaction ID</td>
          <td style="padding:6px 0;text-align:right;font-family:monospace;font-size:12px;color:#888">${escapeHtml(shortTxnId)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-weight:600;color:#333">Payment Method</td>
          <td style="padding:6px 0;text-align:right">${escapeHtml(methodLabel)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-weight:600;color:#333">Date</td>
          <td style="padding:6px 0;text-align:right">${escapeHtml(dateStr)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-weight:600;color:#333">Ship to</td>
          <td style="padding:6px 0;text-align:right;max-width:260px;word-wrap:break-word">${escapeHtml(payload.shippingAddress || "Not provided")}</td>
        </tr>
      </table>
    </div>

    <!-- Items Table -->
    <div style="padding:0 24px 20px">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#fdf2f8">
            <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#9c4474;text-transform:uppercase;letter-spacing:0.5px">Product</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600;color:#9c4474;text-transform:uppercase;letter-spacing:0.5px">Qty</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;color:#9c4474;text-transform:uppercase;letter-spacing:0.5px">Price</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;color:#9c4474;text-transform:uppercase;letter-spacing:0.5px">Total</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
    </div>

    <!-- Summary -->
    <div style="padding:0 24px 24px">
      <div style="background:#fdf2f8;border-radius:8px;padding:16px 20px">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr>
            <td style="padding:4px 0;color:#6b7280">Subtotal</td>
            <td style="padding:4px 0;text-align:right;color:#333">$${payload.subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#6b7280">Tax (8%)</td>
            <td style="padding:4px 0;text-align:right;color:#333">$${payload.tax.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#6b7280">Shipping</td>
            <td style="padding:4px 0;text-align:right;color:#333">${payload.shipping === 0 ? "Free" : "$" + payload.shipping.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding:10px 0 4px;font-size:16px;font-weight:700;color:#333;border-top:2px solid #e8a0bf">TOTAL</td>
            <td style="padding:10px 0 4px;text-align:right;font-size:16px;font-weight:700;color:#d4628e;border-top:2px solid #e8a0bf">$${payload.totalAmount.toFixed(2)}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#faf5f8;padding:24px;text-align:center;border-top:1px solid #f0e6ef">
      <p style="margin:0 0 8px;font-size:14px;color:#333;font-weight:600">Thank you for shopping with AuraSkin AI</p>
      <p style="margin:0;font-size:12px;color:#9ca3af">Questions about your order? Simply reply to this email.</p>
      <p style="margin:12px 0 0;font-size:11px;color:#d1d5db">&copy; ${new Date().getFullYear()} AuraSkin AI. All rights reserved.</p>
    </div>

  </div>
</body>
</html>`;

    const text = [
      `AuraSkin AI — Order Confirmation #${shortOrderId}`,
      "",
      `Hi ${payload.customerName},`,
      "",
      "Your order has been confirmed!",
      "",
      `Order ID: ${shortOrderId}`,
      `Transaction ID: ${shortTxnId}`,
      `Payment: ${methodLabel}`,
      `Date: ${dateStr}`,
      `Ship to: ${payload.shippingAddress || "Not provided"}`,
      "",
      "Items:",
      ...payload.items.map(
        (i) =>
          `  - ${i.productName} x${i.quantity} @ $${i.unitPrice.toFixed(2)} = $${(i.unitPrice * i.quantity).toFixed(2)}`
      ),
      "",
      `Subtotal: $${payload.subtotal.toFixed(2)}`,
      `Tax (8%): $${payload.tax.toFixed(2)}`,
      `Shipping: ${payload.shipping === 0 ? "Free" : "$" + payload.shipping.toFixed(2)}`,
      `TOTAL: $${payload.totalAmount.toFixed(2)}`,
      "",
      "Thank you for shopping with AuraSkin AI!",
    ].join("\n");

    await transporter.sendMail({
      from,
      to: payload.customerEmail,
      subject: `AuraSkin AI — Order Confirmation #${shortOrderId}`,
      html,
      text,
    });

    this.logger.log(
      `Invoice email sent for order ${shortOrderId} to ${payload.customerEmail}`
    );
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
