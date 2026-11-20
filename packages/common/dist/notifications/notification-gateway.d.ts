export type NotificationChannel = 'FCM_PUSH' | 'WHATSAPP' | 'SMS';
export type NotificationPriority = 'CRITICAL' | 'HIGH' | 'NORMAL';
export interface NotificationPayload {
    recipientUserId: string;
    recipientPhone: string;
    fcmToken?: string;
    title: string;
    body: string;
    priority: NotificationPriority;
    orderId?: string;
    metadata?: Record<string, any>;
}
export interface DeliveryAttempt {
    channel: NotificationChannel;
    timestamp: string;
    success: boolean;
    messageId?: string;
    error?: string;
}
export interface NotificationDeliveryResult {
    notificationId: string;
    recipientUserId: string;
    deliveredChannel: NotificationChannel | null;
    attempts: DeliveryAttempt[];
    status: 'DELIVERED' | 'FAILED';
    completedAt: string;
}
export interface ChannelSender {
    sendPush(token: string, title: string, body: string, data?: Record<string, any>): Promise<{
        messageId: string;
    }>;
    sendWhatsApp(phone: string, template: string, variables: Record<string, string>): Promise<{
        messageId: string;
    }>;
    sendSms(phone: string, text: string): Promise<{
        messageId: string;
    }>;
}
export declare class MultiChannelNotificationGateway {
    private readonly sender?;
    constructor(sender?: ChannelSender);
    dispatchNotification(payload: NotificationPayload): Promise<NotificationDeliveryResult>;
}
//# sourceMappingURL=notification-gateway.d.ts.map