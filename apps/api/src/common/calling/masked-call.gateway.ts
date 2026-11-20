import { Injectable, Logger } from '@nestjs/common';
import crypto from 'node:crypto';
import { MaskedCallInitiateRequest, MaskedCallSessionResponse, IMaskedCallGateway } from './masked-call.interface.js';

@Injectable()
export class MaskedCallGateway implements IMaskedCallGateway {
  private readonly logger = new Logger(MaskedCallGateway.name);
  private readonly activeSessions = new Map<string, MaskedCallSessionResponse>();

  async initiateMaskedBridge(request: MaskedCallInitiateRequest): Promise<MaskedCallSessionResponse> {
    const callSid = `call_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const virtualNumber = '+918047193000';
    const relayPin = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const session: MaskedCallSessionResponse = {
      callSid,
      orderId: request.orderId,
      virtualNumber,
      relayPin,
      status: 'INITIATED',
      expiresAt,
      provider: 'EXOTEL',
    };

    this.activeSessions.set(callSid, session);
    this.logger.log(`Masked bridge initiated via ${session.provider} (Sid: ${callSid}) for order ${request.orderId}`);
    return session;
  }

  async terminateSession(callSid: string): Promise<boolean> {
    const session = this.activeSessions.get(callSid);
    if (session) {
      session.status = 'COMPLETED';
      return true;
    }
    return false;
  }
}
