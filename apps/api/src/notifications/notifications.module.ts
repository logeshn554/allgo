import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { FirebaseAdminFcmService } from './fcm/fcm-push.service.js';
import { IndiaDltSmsGateway } from './sms/india-dlt-sms.gateway.js';
import { NotificationLocalizationService } from './notification-localization.service.js';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    FirebaseAdminFcmService,
    IndiaDltSmsGateway,
    NotificationLocalizationService,
  ],
  exports: [
    NotificationsService,
    FirebaseAdminFcmService,
    IndiaDltSmsGateway,
    NotificationLocalizationService,
  ],
})
export class NotificationsModule {}
