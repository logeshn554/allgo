class EligiblePromotion {
  final String id;
  final String code;
  final String title;
  final bool isAutoApplied;
  final bool newCustomerOnly;
  final double minOrderAmountInr;
  final double? discountPercentage;
  final double? flatDiscountInr;
  final double? maxDiscountInr;
  final bool isEligible;
  final String reason;
  final double potentialDiscountInr;

  EligiblePromotion({
    required this.id,
    required this.code,
    required this.title,
    required this.isAutoApplied,
    required this.newCustomerOnly,
    required this.minOrderAmountInr,
    this.discountPercentage,
    this.flatDiscountInr,
    this.maxDiscountInr,
    required this.isEligible,
    required this.reason,
    required this.potentialDiscountInr,
  });

  factory EligiblePromotion.fromJson(Map<String, dynamic> json) {
    return EligiblePromotion(
      id: json['id']?.toString() ?? '',
      code: json['code']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      isAutoApplied: json['isAutoApplied'] as bool? ?? false,
      newCustomerOnly: json['newCustomerOnly'] as bool? ?? false,
      minOrderAmountInr: (json['minOrderAmountInr'] as num?)?.toDouble() ?? 0.0,
      discountPercentage: (json['discountPercentage'] as num?)?.toDouble(),
      flatDiscountInr: (json['flatDiscountInr'] as num?)?.toDouble(),
      maxDiscountInr: (json['maxDiscountInr'] as num?)?.toDouble(),
      isEligible: json['isEligible'] as bool? ?? false,
      reason: json['reason']?.toString() ?? '',
      potentialDiscountInr: (json['potentialDiscountInr'] as num?)?.toDouble() ?? 0.0,
    );
  }
}
