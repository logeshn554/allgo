import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '../../redis/redis.module.js';
import { GoogleMapsGateway } from './google-maps.gateway.js';

@Module({
  imports: [ConfigModule, RedisModule],
  providers: [
    GoogleMapsGateway,
    {
      provide: 'MapsGateway',
      useExisting: GoogleMapsGateway,
    },
  ],
  exports: [GoogleMapsGateway, 'MapsGateway'],
})
export class MapsModule {}
