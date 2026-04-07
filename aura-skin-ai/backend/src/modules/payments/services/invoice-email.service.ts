import { Injectable, Logger } from "@nestjs/common";

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

@Injectable()
export class InvoiceEmailService {
  private readonly logger = new Logger(InvoiceEmailService.name);

  async sendOrderInvoice(payload: SendInvoicePayload): Promise<void> {
    const shortOrderId = payload.orderId.slice(0, 8).toUpperCase();
    
    this.logger.warn(
      `Invoice email feature is currently disabled (Nodemailer removed). ` +
      `Order ${shortOrderId} would have been sent to ${payload.customerEmail}.`
    );
    
    // In a future update, this could be migrated to a dedicated email service provider.
  }
}
