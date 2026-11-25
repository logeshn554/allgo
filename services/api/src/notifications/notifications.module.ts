import { Module } from '@nestjs/common';
import { FirebaseAdminFcmService } from './fcm/fcm-push.service.js';
import { NotificationLocalizationService } from './notification-localization.service.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { IndiaDltSmsGateway } from './sms/india-dlt-sms.gateway.js';

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
