export interface CreateGatewayOrderParams {
  amountInr: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface GatewayOrderResult {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export interface CreateGatewayRefundParams {
  paymentId: string;
  amountInr: number;
  notes?: Record<string, string>;
  speed?: 'normal' | 'optimum';
}

export interface GatewayRefundResult {
  id: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
}

export interface GatewayPaymentDetails {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  method?: string;
  errorCode?: string;
  errorDescription?: string;
}

export interface PaymentGateway {
  createOrder(params: CreateGatewayOrderParams): Promise<GatewayOrderResult>;
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean;
  createRefund(params: CreateGatewayRefundParams): Promise<GatewayRefundResult>;
  fetchPayment(paymentId: string): Promise<GatewayPaymentDetails>;
}
