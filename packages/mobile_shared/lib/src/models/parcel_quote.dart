class ParcelQuote {
  final String serviceType;
  final double distanceKm;
  final double chargeableWeightKg;
  final double baseFareInr;
  final double distanceFareInr;
  final double weightFareInr;
  final double serviceMultiplier;
  final double platformFeeInr;
  final double gstInr;
  final double totalAmountInr;
  final String expiresAt;

  const ParcelQuote({
    required this.serviceType,
    required this.distanceKm,
    required this.chargeableWeightKg,
    required this.baseFareInr,
    required this.distanceFareInr,
    required this.weightFareInr,
    required this.serviceMultiplier,
    required this.platformFeeInr,
    required this.gstInr,
    required this.totalAmountInr,
    required this.expiresAt,
  });

  factory ParcelQuote.fromJson(Map<String, dynamic> json) {
    return ParcelQuote(
      serviceType: json['serviceType'] as String? ?? 'STANDARD',
      distanceKm: (json['distanceKm'] as num?)?.toDouble() ?? 0.0,
      chargeableWeightKg: (json['chargeableWeightKg'] as num?)?.toDouble() ?? 0.0,
      baseFareInr: (json['baseFareInr'] as num?)?.toDouble() ?? 0.0,
      distanceFareInr: (json['distanceFareInr'] as num?)?.toDouble() ?? 0.0,
      weightFareInr: (json['weightFareInr'] as num?)?.toDouble() ?? 0.0,
      serviceMultiplier: (json['serviceMultiplier'] as num?)?.toDouble() ?? 1.0,
      platformFeeInr: (json['platformFeeInr'] as num?)?.toDouble() ?? 0.0,
      gstInr: (json['gstInr'] as num?)?.toDouble() ?? 0.0,
      totalAmountInr: (json['totalAmountInr'] as num?)?.toDouble() ?? 0.0,
      expiresAt: json['expiresAt'] as String? ?? '',
    );
  }
}
