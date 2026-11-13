// Job: Initialize payments via UPI, Cards, or Cash on Delivery.

export type PaymentMethod = 'upi' | 'card' | 'cod';

export interface PaymentIntentResult {
  paymentId: string;
  status: 'authorized' | 'pending' | 'failed';
  method: PaymentMethod;
}

export async function processPayment(
  amountCents: number,
  method: PaymentMethod
): Promise<PaymentIntentResult> {
  if (method === 'cod') {
    return { paymentId: `cod_${Date.now()}`, status: 'authorized', method: 'cod' };
  }

  // Simulated gateway confirmation (Razorpay / Cashfree client signature flow)
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        paymentId: `pay_${Date.now()}_${amountCents}`,
        status: 'authorized',
        method,
      });
    }, 600);
  });
}
