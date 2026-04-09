export interface ConsultationInvoiceData {
  invoiceId: string;
  paymentId: string;
  doctorName: string;
  consultationDate: string;
  consultationFee: string;
  customerEmail: string;
}

export function getConsultationInvoiceTemplate(data: ConsultationInvoiceData): string {
  const {
    invoiceId,
    paymentId,
    doctorName,
    consultationDate,
    consultationFee,
    customerEmail,
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
    .consultation-card {
      padding: 24px;
      border: 1px solid #EEE6CA;
      border-radius: 12px;
      margin-bottom: 30px;
    }
    .doctor-name {
      font-size: 18px;
      font-weight: 600;
      color: #896C6C;
      margin-bottom: 4px;
    }
    .consultation-info {
      font-size: 14px;
      color: #666;
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
      <div class="title">Consultation Invoice</div>
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
        <span class="detail-label">Patient Email</span>
        <span>${customerEmail}</span>
      </div>
    </div>

    <div class="consultation-card">
      <div class="doctor-name">Dr. ${doctorName}</div>
      <div class="consultation-info">Expert Dermatologist Consultation</div>
      <div style="margin-top: 12px; font-size: 14px; color: #896C6C;">
        Scheduled Date: <strong>${consultationDate}</strong>
      </div>
    </div>

    <div class="total-section">
      <div style="font-size: 14px; color: #896C6C; margin-bottom: 4px;">Consultation Fee</div>
      <div class="total-amount">${consultationFee}</div>
    </div>

    <div class="footer">
      Thank you for booking with AuraSkin AI.<br>
      Professional care powered by advanced AI.
    </div>
  </div>
</body>
</html>
  `;
}
