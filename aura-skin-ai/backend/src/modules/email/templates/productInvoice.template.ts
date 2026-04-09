export interface ProductInvoiceData {
  invoiceId: string;
  paymentId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: string;
  customerEmail: string;
  purchaseDate: string;
}

export function getProductInvoiceTemplate(data: ProductInvoiceData): string {
  const {
    invoiceId,
    paymentId,
    productName,
    quantity,
    unitPrice,
    totalAmount,
    customerEmail,
    purchaseDate,
  } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Kaushan+Script&family=Inter:wght@400;600&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', sans-serif;
      background-color: #F5FAE1;
      margin: 0;
      padding: 40px 20px;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #FFFFFF;
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 10px 30px rgba(137, 108, 108, 0.08);
      border: 1px solid #EEE6CA;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .logo {
      font-family: 'Kaushan Script', cursive;
      font-size: 32px;
      color: #896C6C;
      margin-bottom: 8px;
    }
    .title {
      font-size: 18px;
      color: #E5BEB5;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 600;
    }
    .invoice-details {
      margin-bottom: 30px;
      padding: 20px;
      background-color: #F5FAE1;
      border-radius: 12px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .detail-label {
      color: #896C6C;
      font-weight: 600;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .table th {
      text-align: left;
      padding: 12px 0;
      border-bottom: 2px solid #EEE6CA;
      color: #896C6C;
      font-weight: 600;
    }
    .table td {
      padding: 12px 0;
      border-bottom: 1px solid #EEE6CA;
      font-size: 15px;
    }
    .total-section {
      text-align: right;
      margin-top: 20px;
    }
    .total-amount {
      font-size: 24px;
      font-weight: 600;
      color: #896C6C;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      font-size: 13px;
      color: #E5BEB5;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">AuraSkin AI</div>
      <div class="title">Official Invoice</div>
    </div>

    <div class="invoice-details">
      <div class="detail-row">
        <span class="detail-label">Invoice ID</span>
        <span>${invoiceId}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Payment ID</span>
        <span>${paymentId}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Customer</span>
        <span>${customerEmail}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Date</span>
        <span>${purchaseDate}</span>
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Product</th>
          <th>Qty</th>
          <th>Price</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${productName}</td>
          <td>${quantity}</td>
          <td>$${Number(unitPrice).toFixed(2)}</td>
          <td style="text-align: right;">$${(quantity * unitPrice).toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <div class="total-section">
      <div style="font-size: 14px; color: #896C6C; margin-bottom: 4px;">Grand Total</div>
      <div class="total-amount">${totalAmount}</div>
    </div>

    <div class="footer">
      Thank you for choosing AuraSkin AI.<br>
      Empowering your skin health with AI.
    </div>
  </div>
</body>
</html>
  `;
}
