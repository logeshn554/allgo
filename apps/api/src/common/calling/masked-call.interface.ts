export interface MaskedCallInitiateRequest {
  orderId: string;
  customerId: string;
  partnerId: string;
  customerPhone: string;
  partnerPhone: string;
}

export interface MaskedCallSessionResponse {
  callSid: string;
  orderId: string;
  virtualNumber: string;
  relayPin: string;
  status: 'INITIATED' | 'CONNECTED' | 'COMPLETED' | 'FAILED';
  expiresAt: string;
  provider: 'EXOTEL' | 'TWILIO';
}

export interface IMaskedCallGateway {
  initiateMaskedBridge(request: MaskedCallInitiateRequest): Promise<MaskedCallSessionResponse>;
  terminateSession(callSid: string): Promise<boolean>;
}
