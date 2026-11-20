export interface GstInvoiceData {
  invoiceNumber: string;
  subOrderId: string;
  orderGroupId: string;
  merchantName: string;
  merchantGstin?: string;
  merchantFssai?: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: Array<{
    title: string;
    quantity: number;
    unitPriceInr: number;
    totalInr: number;
    gstRatePercent: number;
  }>;
  taxableAmountInr: number;
  cgstAmountInr: number;
  sgstAmountInr: number;
  igstAmountInr: number;
  deliveryFeeInr: number;
  packagingFeeInr: number;
  totalAmountInr: number;
  issuedAt: Date;
}

export interface CustomerOrderSummaryInvoice {
  orderGroupId: string;
  customerName: string;
  totalAmountPaidInr: number;
  subInvoices: Array<{
    subOrderId: string;
    merchantName: string;
    subTotalInr: number;
    invoiceNumber: string;
  }>;
  totalCgstInr: number;
  totalSgstInr: number;
  issuedAt: Date;
}
