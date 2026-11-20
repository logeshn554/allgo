import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { RedisModule } from './redis/redis.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { MerchantModule } from './merchant/merchant.module.js';
import { PartnerModule } from './partner/partner.module.js';
import { EncryptionModule } from './common/encryption/encryption.module.js';
import { StorageModule } from './storage/storage.module.js';
import { MapsModule } from './common/maps/maps.module.js';
import { ComplianceModule } from './common/compliance/compliance.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { DeliveryModule } from './delivery/delivery.module.js';
import { MobilityModule } from './mobility/mobility.module.js';
import { OrderingModule } from './ordering/ordering.module.js';
import { ZonesModule } from './zones/zones.module.js';
import { DiscoveryModule } from './discovery/discovery.module.js';
import { ParcelModule } from './parcel/parcel.module.js';
import { FinanceModule } from './finance/finance.module.js';
import { SupportModule } from './support/support.module.js';
import { RatingsModule } from './ratings/ratings.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { SchedulingModule } from './common/scheduling/scheduling.module.js';
import { CallingModule } from './common/calling/calling.module.js';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { StructuredLoggingInterceptor } from './common/interceptors/logging.interceptor.js';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    RedisModule,
    HealthModule,
    AuthModule,
    UsersModule,
    MerchantModule,
    PartnerModule,
    EncryptionModule,
    StorageModule,
    MapsModule,
    ComplianceModule,
    CatalogModule,
    DeliveryModule,
    MobilityModule,
    OrderingModule,
    ZonesModule,
    DiscoveryModule,
    ParcelModule,
    FinanceModule,
    SupportModule,
    RatingsModule,
    NotificationsModule,
    SchedulingModule,
    CallingModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalHttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: StructuredLoggingInterceptor,
    },
  ],
})
export class AppModule {}
