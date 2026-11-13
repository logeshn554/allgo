import 'discovery_outlet.dart';

class ServiceabilityResult {
  final bool isServiceable;
  final String? reason;
  final ZoneInfo? zone;
  final ZoneServiceSettings? serviceSettings;
  final int eligibleOutletsCount;
  final List<DiscoveryOutlet> eligibleOutlets;

  ServiceabilityResult({
    required this.isServiceable,
    this.reason,
    this.zone,
    this.serviceSettings,
    required this.eligibleOutletsCount,
    required this.eligibleOutlets,
  });

  factory ServiceabilityResult.fromJson(Map<String, dynamic> json) {
    final rawOutlets = json['eligibleOutlets'] as List<dynamic>? ?? [];
    return ServiceabilityResult(
      isServiceable: json['isServiceable'] as bool? ?? false,
      reason: json['reason']?.toString(),
      zone: json['zone'] != null ? ZoneInfo.fromJson(json['zone'] as Map<String, dynamic>) : null,
      serviceSettings: json['serviceSettings'] != null
          ? ZoneServiceSettings.fromJson(json['serviceSettings'] as Map<String, dynamic>)
          : null,
      eligibleOutletsCount: json['eligibleOutletsCount'] as int? ?? rawOutlets.length,
      eligibleOutlets: rawOutlets.map((e) => DiscoveryOutlet.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }
}

class ZoneInfo {
  final String id;
  final String name;
  final String code;
  final String? cityId;

  ZoneInfo({
    required this.id,
    required this.name,
    required this.code,
    this.cityId,
  });

  factory ZoneInfo.fromJson(Map<String, dynamic> json) {
    return ZoneInfo(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      code: json['code']?.toString() ?? '',
      cityId: json['cityId']?.toString(),
    );
  }
}

class ZoneServiceSettings {
  final String verticalType;
  final double minOrderValueInr;
  final double baseDeliveryFeeInr;
  final double perKmFeeInr;
  final double freeDeliveryDistanceKm;
  final double maxServiceRadiusKm;
  final double surgeMultiplier;
  final bool isSurgeActive;
  final String? surgeReason;

  ZoneServiceSettings({
    required this.verticalType,
    required this.minOrderValueInr,
    required this.baseDeliveryFeeInr,
    required this.perKmFeeInr,
    required this.freeDeliveryDistanceKm,
    required this.maxServiceRadiusKm,
    required this.surgeMultiplier,
    required this.isSurgeActive,
    this.surgeReason,
  });

  factory ZoneServiceSettings.fromJson(Map<String, dynamic> json) {
    return ZoneServiceSettings(
      verticalType: json['verticalType']?.toString() ?? 'FOOD',
      minOrderValueInr: (json['minOrderValueInr'] as num?)?.toDouble() ?? 99.0,
      baseDeliveryFeeInr: (json['baseDeliveryFeeInr'] as num?)?.toDouble() ?? 30.0,
      perKmFeeInr: (json['perKmFeeInr'] as num?)?.toDouble() ?? 10.0,
      freeDeliveryDistanceKm: (json['freeDeliveryDistanceKm'] as num?)?.toDouble() ?? 3.0,
      maxServiceRadiusKm: (json['maxServiceRadiusKm'] as num?)?.toDouble() ?? 15.0,
      surgeMultiplier: (json['surgeMultiplier'] as num?)?.toDouble() ?? 1.0,
      isSurgeActive: json['isSurgeActive'] as bool? ?? false,
      surgeReason: json['surgeReason']?.toString(),
    );
  }
}
