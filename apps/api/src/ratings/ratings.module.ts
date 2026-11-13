import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { RatingsService } from './ratings.service.js';
import { RatingsController } from './ratings.controller.js';

@Module({
  imports: [DatabaseModule, RedisModule],
  controllers: [RatingsController],
  providers: [RatingsService],
  exports: [RatingsService],
})
export class RatingsModule {}
