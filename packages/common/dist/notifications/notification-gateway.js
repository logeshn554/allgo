// Job: Fallback notification gateway (FCM/APNs -> WhatsApp Business API -> SMS Gateway) with delivery tracking.
export class MultiChannelNotificationGateway {
    sender;
    constructor(sender) {
        this.sender = sender;
    }
    async dispatchNotification(payload) {
        const notificationId = `NOTIF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const attempts = [];
        // 1. Primary Channel: Firebase Cloud Messaging (FCM) / APNs
        if (payload.fcmToken) {
            try {
                const res = this.sender
                    ? await this.sender.sendPush(payload.fcmToken, payload.title, payload.body, payload.metadata)
                    : { messageId: `fcm-${Date.now()}` };
                attempts.push({
                    channel: 'FCM_PUSH',
                    timestamp: new Date().toISOString(),
                    success: true,
                    messageId: res.messageId,
                });
                return {
                    notificationId,
                    recipientUserId: payload.recipientUserId,
                    deliveredChannel: 'FCM_PUSH',
                    attempts,
                    status: 'DELIVERED',
                    completedAt: new Date().toISOString(),
                };
            }
            catch (err) {
                attempts.push({
                    channel: 'FCM_PUSH',
                    timestamp: new Date().toISOString(),
                    success: false,
                    error: err.message || 'FCM push delivery timed out',
                });
            }
        }
        else {
            attempts.push({
                channel: 'FCM_PUSH',
                timestamp: new Date().toISOString(),
                success: false,
                error: 'No registered push device token for user',
            });
        }
        // 2. Secondary Channel: WhatsApp Business API (Interactive / Template message)
        if (payload.recipientPhone) {
            try {
                const res = this.sender
                    ? await this.sender.sendWhatsApp(payload.recipientPhone, 'order_alert_v1', {
                        order_id: payload.orderId || '',
                        message: payload.body,
                    })
                    : { messageId: `wa-${Date.now()}` };
                attempts.push({
                    channel: 'WHATSAPP',
                    timestamp: new Date().toISOString(),
                    success: true,
                    messageId: res.messageId,
                });
                return {
                    notificationId,
                    recipientUserId: payload.recipientUserId,
                    deliveredChannel: 'WHATSAPP',
                    attempts,
                    status: 'DELIVERED',
                    completedAt: new Date().toISOString(),
                };
            }
            catch (err) {
                attempts.push({
                    channel: 'WHATSAPP',
                    timestamp: new Date().toISOString(),
                    success: false,
                    error: err.message || 'WhatsApp message rejected or opt-out window closed',
                });
            }
        }
        // 3. Tertiary Channel: DLT-Compliant SMS Gateway
        if (payload.recipientPhone) {
            try {
                const smsText = `AllGo Alert: ${payload.body}`;
                const res = this.sender
                    ? await this.sender.sendSms(payload.recipientPhone, smsText)
                    : { messageId: `sms-${Date.now()}` };
                attempts.push({
                    channel: 'SMS',
                    timestamp: new Date().toISOString(),
                    success: true,
                    messageId: res.messageId,
                });
                return {
                    notificationId,
                    recipientUserId: payload.recipientUserId,
                    deliveredChannel: 'SMS',
                    attempts,
                    status: 'DELIVERED',
                    completedAt: new Date().toISOString(),
                };
            }
            catch (err) {
                attempts.push({
                    channel: 'SMS',
                    timestamp: new Date().toISOString(),
                    success: false,
                    error: err.message || 'SMS telco carrier failure',
                });
            }
        }
        return {
            notificationId,
            recipientUserId: payload.recipientUserId,
            deliveredChannel: null,
            attempts,
            status: 'FAILED',
            completedAt: new Date().toISOString(),
        };
    }
}
//# sourceMappingURL=notification-gateway.js.map