// Job: ESC/POS byte-stream generator for WebUSB, Bluetooth, and Network thermal receipt printers.

export interface PrintOrderTicketData {
  orderId: string;
  orderType: 'DINE_IN' | 'DELIVERY' | 'PICKUP';
  timestamp: string;
  customerName?: string;
  customerPhone?: string;
  handoverOtp?: string;
  items: { name: string; quantity: number; notes?: string }[];
  prepTimeMinutes: number;
}

export interface PrintCustomerReceiptData {
  orderId: string;
  storeName: string;
  timestamp: string;
  customerName?: string;
  items: { name: string; quantity: number; priceCents: number }[];
  subtotalCents: number;
  taxCents: number;
  deliveryFeeCents?: number;
  packagingCents?: number;
  totalCents: number;
  paymentMethod: string;
}

export class EscPosThermalPrinter {
  // ESC/POS Command Constants
  private static readonly ESC = '\x1B';
  private static readonly GS = '\x1D';
  private static readonly INIT = '\x1B@';
  private static readonly BOLD_ON = '\x1BE\x01';
  private static readonly BOLD_OFF = '\x1BE\x00';
  private static readonly ALIGN_CENTER = '\x1Ba\x01';
  private static readonly ALIGN_LEFT = '\x1Ba\x00';
  private static readonly CUT_PAPER = '\x1DVA\x00'; // Partial/full cut

  static formatKitchenOrderTicket(ticket: PrintOrderTicketData): string {
    let out = '';
    out += this.INIT;
    out += this.ALIGN_CENTER;
    out += this.BOLD_ON;
    out += '*** KITCHEN ORDER TICKET (KOT) ***\n';
    out += `ALLGO KDS - ORDER #${ticket.orderId}\n`;
    out += this.BOLD_OFF;
    out += `Type: ${ticket.orderType} | Est. Prep: ${ticket.prepTimeMinutes}m\n`;
    out += `Placed: ${ticket.timestamp}\n`;
    out += '--------------------------------\n';
    out += this.ALIGN_LEFT;
    out += this.BOLD_ON;
    out += 'QTY  ITEM DESCRIPTION\n';
    out += this.BOLD_OFF;
    out += '--------------------------------\n';

    for (const item of ticket.items) {
      const qtyStr = String(item.quantity).padEnd(5, ' ');
      out += `${qtyStr}${item.name}\n`;
      if (item.notes) {
        out += `     >> Note: ${item.notes}\n`;
      }
    }

    out += '--------------------------------\n';
    if (ticket.handoverOtp) {
      out += this.ALIGN_CENTER;
      out += this.BOLD_ON;
      out += `COURIER HANDOVER OTP: ${ticket.handoverOtp}\n`;
      out += this.BOLD_OFF;
    }
    out += '\n\n';
    out += this.CUT_PAPER;
    return out;
  }

  static async printTicket(
    ticket: PrintOrderTicketData,
    transport?: (rawCommands: string) => Promise<boolean>,
  ): Promise<{ success: boolean; bytesLength: number; message: string }> {
    const raw = this.formatKitchenOrderTicket(ticket);
    if (transport) {
      const ok = await transport(raw);
      return { success: ok, bytesLength: raw.length, message: 'Printed via thermal connection' };
    }
    return {
      success: true,
      bytesLength: raw.length,
      message: `ESC/POS thermal ticket generated (${raw.length} bytes)`,
    };
  }

  static formatCustomerReceipt(receipt: PrintCustomerReceiptData): string {
    let out = '';
    out += this.INIT;
    out += this.ALIGN_CENTER;
    out += this.BOLD_ON;
    out += `${receipt.storeName.toUpperCase()}\n`;
    out += 'CUSTOMER TAX INVOICE / RECEIPT\n';
    out += this.BOLD_OFF;
    out += `Order #${receipt.orderId} | ${receipt.timestamp}\n`;
    out += '--------------------------------\n';
    out += this.ALIGN_LEFT;
    out += this.BOLD_ON;
    out += 'QTY  ITEM               AMOUNT\n';
    out += this.BOLD_OFF;
    out += '--------------------------------\n';

    for (const item of receipt.items) {
      const qtyStr = String(item.quantity).padEnd(5, ' ');
      const priceStr = `₹${((item.priceCents * item.quantity) / 100).toFixed(0)}`.padStart(8, ' ');
      const nameTrunc =
        item.name.length > 18 ? item.name.substring(0, 16) + '..' : item.name.padEnd(18, ' ');
      out += `${qtyStr}${nameTrunc}${priceStr}\n`;
    }

    out += '--------------------------------\n';
    out += `Subtotal:              ₹${(receipt.subtotalCents / 100).toFixed(0)}\n`;
    out += `GST (5%):              ₹${(receipt.taxCents / 100).toFixed(0)}\n`;
    if (receipt.packagingCents) {
      out += `Packaging:             ₹${(receipt.packagingCents / 100).toFixed(0)}\n`;
    }
    if (receipt.deliveryFeeCents) {
      out += `Delivery Fee:          ₹${(receipt.deliveryFeeCents / 100).toFixed(0)}\n`;
    }
    out += this.BOLD_ON;
    out += `TOTAL PAID:            ₹${(receipt.totalCents / 100).toFixed(0)}\n`;
    out += this.BOLD_OFF;
    out += `Tender: ${receipt.paymentMethod.toUpperCase()}\n`;
    out += '--------------------------------\n';
    out += this.ALIGN_CENTER;
    out += 'Thank you for choosing AllGo!\n\n\n';
    out += this.CUT_PAPER;
    return out;
  }

  static async printReceipt(
    receipt: PrintCustomerReceiptData,
    transport?: (rawCommands: string) => Promise<boolean>,
  ): Promise<{ success: boolean; bytesLength: number; message: string }> {
    const raw = this.formatCustomerReceipt(receipt);
    if (transport) {
      const ok = await transport(raw);
      return {
        success: ok,
        bytesLength: raw.length,
        message: 'Customer receipt printed via thermal connection',
      };
    }
    return {
      success: true,
      bytesLength: raw.length,
      message: `ESC/POS thermal receipt generated (${raw.length} bytes)`,
    };
  }
}
