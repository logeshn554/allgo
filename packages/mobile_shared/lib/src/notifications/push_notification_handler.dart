class PushNotificationPayload {
  final String category;
  final String role;
  final String? title;
  final String? body;
  final String? referenceType;
  final String? referenceId;
  final bool isFullScreenAlert;
  final Map<String, dynamic> rawData;

  const PushNotificationPayload({
    required this.category,
    required this.role,
    this.title,
    this.body,
    this.referenceType,
    this.referenceId,
    this.isFullScreenAlert = false,
    this.rawData = const {},
  });

  factory PushNotificationPayload.fromMap(Map<String, dynamic> data, {String? title, String? body}) {
    return PushNotificationPayload(
      category: data['category']?.toString() ?? 'GENERAL',
      role: data['role']?.toString() ?? 'CUSTOMER',
      title: title,
      body: body,
      referenceType: data['referenceType']?.toString(),
      referenceId: data['referenceId']?.toString(),
      isFullScreenAlert: data['isFullScreenAlert'] == 'true' || data['isFullScreenAlert'] == true,
      rawData: data,
    );
  }

  bool get isMerchantNewOrder => role == 'MERCHANT' && (category == 'BOOKING' || referenceType == 'ORDER');
  bool get isPartnerJobOffer => role == 'PARTNER' && (category == 'BOOKING' || referenceType == 'JOB_OFFER');
}

abstract class PushNotificationHandler {
  Future<void> onMessageReceived(PushNotificationPayload payload);
  Future<void> onNotificationOpened(PushNotificationPayload payload);
}

class AllGoNotificationChannels {
  static const String merchantOrders = 'merchant_orders_channel';
  static const String partnerJobs = 'partner_jobs_channel';
  static const String criticalAlerts = 'critical_alerts_channel';
  static const String general = 'general_channel';
}
