import { Global, Module } from '@nestjs/common';
import { MaskedCallGateway } from './masked-call.gateway.js';

@Global()
@Module({
  providers: [MaskedCallGateway],
  exports: [MaskedCallGateway],
})
export class CallingModule {}
