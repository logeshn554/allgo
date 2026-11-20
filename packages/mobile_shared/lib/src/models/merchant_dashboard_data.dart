class OrderSummaryStats {
  final int newOrders;
  final int accepted;
  final int preparing;
  final int ready;
  final int completed;
  final int cancelled;

  const OrderSummaryStats({
    required this.newOrders,
    required this.accepted,
    required this.preparing,
    required this.ready,
    required this.completed,
    required this.cancelled,
  });

  factory OrderSummaryStats.fromJson(Map<String, dynamic> json) {
    return OrderSummaryStats(
      newOrders: (json['new'] as num?)?.toInt() ?? 0,
      accepted: (json['accepted'] as num?)?.toInt() ?? 0,
      preparing: (json['preparing'] as num?)?.toInt() ?? 0,
      ready: (json['ready'] as num?)?.toInt() ?? 0,
      completed: (json['completed'] as num?)?.toInt() ?? 0,
      cancelled: (json['cancelled'] as num?)?.toInt() ?? 0,
    );
  }
}

class MerchantDashboardData {
  final String status;
  final String? outletId;
  final String? outletName;
  final bool isOpen;
  final int defaultPrepTimeMinutes;
  final double todaySalesInr;
  final double weeklySalesInr;
  final double pendingPayoutInr;
  final OrderSummaryStats orderSummary;
  final double storeRating;
  final double completionRatePercentage;

  bool get outletIsOpen => isOpen;

  const MerchantDashboardData({
    required this.status,
    this.outletId,
    this.outletName,
    required this.isOpen,
    required this.defaultPrepTimeMinutes,
    required this.todaySalesInr,
    required this.weeklySalesInr,
    required this.pendingPayoutInr,
    required this.orderSummary,
    required this.storeRating,
    required this.completionRatePercentage,
  });

  factory MerchantDashboardData.empty() {
    return const MerchantDashboardData(
      status: 'NOT_REGISTERED',
      isOpen: false,
      defaultPrepTimeMinutes: 15,
      todaySalesInr: 0.0,
      weeklySalesInr: 0.0,
      pendingPayoutInr: 0.0,
      orderSummary: OrderSummaryStats(
        newOrders: 0,
        accepted: 0,
        preparing: 0,
        ready: 0,
        completed: 0,
        cancelled: 0,
      ),
      storeRating: 5.0,
      completionRatePercentage: 100.0,
    );
  }

  factory MerchantDashboardData.fromJson(Map<String, dynamic> json) {
    return MerchantDashboardData(
      status: json['status'] as String? ?? 'SUBMITTED',
      outletId: json['outletId'] as String?,
      outletName: json['outletName'] as String?,
      isOpen: json['isOpen'] as bool? ?? false,
      defaultPrepTimeMinutes: (json['defaultPrepTimeMinutes'] as num?)?.toInt() ?? 15,
      todaySalesInr: (json['todaySalesInr'] as num?)?.toDouble() ?? 0.0,
      weeklySalesInr: (json['weeklySalesInr'] as num?)?.toDouble() ?? 0.0,
      pendingPayoutInr: (json['pendingPayoutInr'] as num?)?.toDouble() ?? 0.0,
      orderSummary: OrderSummaryStats.fromJson(json['orderSummary'] as Map<String, dynamic>? ?? {}),
      storeRating: (json['storeRating'] as num?)?.toDouble() ?? 4.85,
      completionRatePercentage: (json['completionRatePercentage'] as num?)?.toDouble() ?? 98.5,
    );
  }
}

