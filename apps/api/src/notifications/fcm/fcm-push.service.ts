import { Injectable, Logger } from '@nestjs/common';
import * as adminNamespace from 'firebase-admin';
import { ConfigService } from '../../config/config.service.js';

const admin = (adminNamespace as any).default || adminNamespace;

export interface FcmSendOptions {
  priority?: 'high' | 'normal';
  collapseKey?: string;
  channelId?: string;
}

export interface FcmPushResult {
  success: boolean;
  messageId?: string;
  invalidToken?: boolean;
  error?: string;
}

export interface FcmPushService {
  sendToDevice(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
    options?: FcmSendOptions
  ): Promise<FcmPushResult>;
}

@Injectable()
export class FirebaseAdminFcmService implements FcmPushService {
  private readonly logger = new Logger(FirebaseAdminFcmService.name);

  constructor(private readonly config: ConfigService) {
    const isProdOrStaging = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
    if (!this.config.firebaseServiceAccountKey && isProdOrStaging) {
      throw new Error('FATAL: FIREBASE_SERVICE_ACCOUNT_KEY is missing. Failing fast in production/staging.');
    }
  }

  async sendToDevice(
    fcmToken: string,
    title: string,
    body: string,
    data: Record<string, string> = {},
    options: FcmSendOptions = {}
  ): Promise<FcmPushResult> {
    if (!fcmToken || typeof fcmToken !== 'string') {
      return { success: false, error: 'Empty FCM token' };
    }

    const priority = options.priority || 'high';
    const channelId = options.channelId || (priority === 'high' ? 'critical_alerts_channel' : 'general_channel');

    const isProdOrStaging = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';

    if (admin.apps.length === 0) {
      if (isProdOrStaging) {
        throw new Error('FATAL: Firebase Admin SDK not initialized in production/staging.');
      }
      if (fcmToken === 'mock_invalid_unregistered_token') {
        return { success: false, invalidToken: true, error: 'messaging/registration-token-not-registered' };
      }
      return {
        success: true,
        messageId: `projects/allgo/messages/mock_${Date.now()}`,
      };
    }

    if (!isProdOrStaging && (fcmToken.startsWith('mock_') || fcmToken.startsWith('test_'))) {
      if (fcmToken === 'mock_invalid_unregistered_token') {
        return { success: false, invalidToken: true, error: 'messaging/registration-token-not-registered' };
      }
      return {
        success: true,
        messageId: `projects/allgo/messages/mock_${Date.now()}`,
      };
    }

    try {
      const message: adminNamespace.messaging.Message = {
        token: fcmToken,
        notification: {
          title,
          body,
        },
        data,
        android: {
          priority: priority === 'high' ? 'high' : 'normal',
          notification: {
            channelId,
            sound: 'default',
            priority: priority === 'high' ? 'max' : 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              contentAvailable: true,
            },
          },
        },
      };

      const messageId = await admin.messaging().send(message);
      return { success: true, messageId };
    } catch (err: any) {
      this.logger.warn(`FCM delivery failed for token ${fcmToken.slice(0, 10)}...: ${err.message}`);
      const isUnregistered =
        err.code === 'messaging/registration-token-not-registered' ||
        err.code === 'messaging/invalid-registration-token' ||
        err.message?.includes('not registered');

      return {
        success: false,
        invalidToken: isUnregistered,
        error: err.message,
      };
    }
  }
}
