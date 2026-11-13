class MerchantOrderItem {
  final String itemId;
  final String itemName;
  final int quantity;
  final double unitPriceInr;
  final double totalPriceInr;

  const MerchantOrderItem({
    required this.itemId,
    required this.itemName,
    required this.quantity,
    required this.unitPriceInr,
    required this.totalPriceInr,
  });

  factory MerchantOrderItem.fromJson(Map<String, dynamic> json) {
    return MerchantOrderItem(
      itemId: json['itemId'] as String? ?? '',
      itemName: json['itemName'] as String? ?? '',
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      unitPriceInr: (json['unitPriceInr'] as num?)?.toDouble() ?? 0.0,
      totalPriceInr: (json['totalPriceInr'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class MerchantOrder {
  final String id;
  final String subOrderNumber;
  final String status;
  final String verticalType;
  final double itemsTotalInr;
  final double packagingFeeInr;
  final double merchantCommissionInr;
  final double merchantNetPayoutInr;
  final double taxTotalInr;
  final int prepTimeMinutes;
  final String? estimatedReadyAt;
  final String? actualReadyAt;
  final String createdAt;
  final String customerName;
  final String customerPhone;
  final List<MerchantOrderItem> items;

  const MerchantOrder({
    required this.id,
    required this.subOrderNumber,
    required this.status,
    required this.verticalType,
    required this.itemsTotalInr,
    required this.packagingFeeInr,
    required this.merchantCommissionInr,
    required this.merchantNetPayoutInr,
    required this.taxTotalInr,
    required this.prepTimeMinutes,
    this.estimatedReadyAt,
    this.actualReadyAt,
    required this.createdAt,
    required this.customerName,
    required this.customerPhone,
    required this.items,
  });

  factory MerchantOrder.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List<dynamic>? ?? [];
    return MerchantOrder(
      id: json['id'] as String? ?? '',
      subOrderNumber: json['subOrderNumber'] as String? ?? '',
      status: json['status'] as String? ?? 'PLACED',
      verticalType: json['verticalType'] as String? ?? 'FOOD',
      itemsTotalInr: (json['itemsTotalInr'] as num?)?.toDouble() ?? 0.0,
      packagingFeeInr: (json['packagingFeeInr'] as num?)?.toDouble() ?? 0.0,
      merchantCommissionInr: (json['merchantCommissionInr'] as num?)?.toDouble() ?? 0.0,
      merchantNetPayoutInr: (json['merchantNetPayoutInr'] as num?)?.toDouble() ?? 0.0,
      taxTotalInr: (json['taxTotalInr'] as num?)?.toDouble() ?? 0.0,
      prepTimeMinutes: (json['prepTimeMinutes'] as num?)?.toInt() ?? 15,
      estimatedReadyAt: json['estimatedReadyAt'] as String?,
      actualReadyAt: json['actualReadyAt'] as String?,
      createdAt: json['createdAt'] as String? ?? '',
      customerName: json['customerName'] as String? ?? 'Customer',
      customerPhone: json['customerPhone'] as String? ?? '••••',
      items: rawItems.map((e) => MerchantOrderItem.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }
}

