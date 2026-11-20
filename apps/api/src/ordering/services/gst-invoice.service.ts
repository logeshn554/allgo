import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '../../storage/storage.service.js';
import { GstInvoiceData, CustomerOrderSummaryInvoice } from '../interfaces/tax-invoice.interface.js';
import { SimplePdfGenerator } from './simple-pdf-generator.js';

@Injectable()
export class GstInvoiceService {
  private readonly logger = new Logger(GstInvoiceService.name);
  private readonly storedInvoices = new Map<string, { storageKey: string; invoiceNumber: string }>();

  constructor(private readonly storageService: StorageService) {}

  async generateSubOrderGstInvoice(data: GstInvoiceData): Promise<{ storageKey: string; signedUrl: string }> {
    const lines = [
      `TAX INVOICE: ${data.invoiceNumber}`,
      `Sub-Order ID: ${data.subOrderId}`,
      `Merchant: ${data.merchantName} | GSTIN: ${data.merchantGstin || 'URP'} | FSSAI: ${data.merchantFssai || 'N/A'}`,
      `Customer: ${data.customerName} | Phone: ${data.customerPhone}`,
      `Delivery Address: ${data.customerAddress}`,
      '------------------------------------------------------------',
      ...data.items.map((i) => `${i.title} x${i.quantity} @ Rs.${i.unitPriceInr.toFixed(2)} = Rs.${i.totalInr.toFixed(2)} (GST ${i.gstRatePercent}%)`),
      '------------------------------------------------------------',
      `Taxable Value: Rs.${data.taxableAmountInr.toFixed(2)}`,
      `CGST: Rs.${data.cgstAmountInr.toFixed(2)} | SGST: Rs.${data.sgstAmountInr.toFixed(2)} | IGST: Rs.${data.igstAmountInr.toFixed(2)}`,
      `Packaging: Rs.${data.packagingFeeInr.toFixed(2)} | Delivery: Rs.${data.deliveryFeeInr.toFixed(2)}`,
      `TOTAL AMOUNT: Rs.${data.totalAmountInr.toFixed(2)}`,
      `Date of Issue: ${data.issuedAt.toISOString()}`,
    ];

    const pdfBuffer = SimplePdfGenerator.generatePdf(`TAX INVOICE - ${data.invoiceNumber}`, lines);
    const storageKey = `invoices/sub_order_${data.subOrderId}_${data.invoiceNumber}.pdf`;

    await this.storageService.uploadKmsEncryptedFile(storageKey, pdfBuffer, 'application/pdf');
    const signedUrl = await this.storageService.generateSignedDownloadUrl(storageKey, {
      action: 'read',
      expiresInSeconds: 3600,
    });

    this.storedInvoices.set(data.subOrderId, { storageKey, invoiceNumber: data.invoiceNumber });
    return { storageKey, signedUrl };
  }

  async generateCombinedCustomerSummary(data: CustomerOrderSummaryInvoice): Promise<{ storageKey: string; signedUrl: string }> {
    const lines = [
      `ORDER SUMMARY & TAX RECAPITULATION`,
      `Order Group ID: ${data.orderGroupId}`,
      `Customer: ${data.customerName}`,
      `Date: ${data.issuedAt.toISOString()}`,
      '------------------------------------------------------------',
      'Outlets in Order:',
      ...data.subInvoices.map((s) => `Merchant: ${s.merchantName} (Inv: ${s.invoiceNumber}) - Total: Rs.${s.subTotalInr.toFixed(2)}`),
      '------------------------------------------------------------',
      `Total CGST: Rs.${data.totalCgstInr.toFixed(2)}`,
      `Total SGST: Rs.${data.totalSgstInr.toFixed(2)}`,
      `GRAND TOTAL CHARGED: Rs.${data.totalAmountPaidInr.toFixed(2)}`,
    ];

    const pdfBuffer = SimplePdfGenerator.generatePdf(`ORDER SUMMARY - ${data.orderGroupId}`, lines);
    const storageKey = `invoices/summary_group_${data.orderGroupId}.pdf`;

    await this.storageService.uploadKmsEncryptedFile(storageKey, pdfBuffer, 'application/pdf');
    const signedUrl = await this.storageService.generateSignedDownloadUrl(storageKey, {
      action: 'read',
      expiresInSeconds: 3600,
    });

    this.storedInvoices.set(data.orderGroupId, { storageKey, invoiceNumber: data.orderGroupId });
    return { storageKey, signedUrl };
  }

  getInvoiceRecord(subOrderOrGroupId: string) {
    return this.storedInvoices.get(subOrderOrGroupId) || null;
  }
}
