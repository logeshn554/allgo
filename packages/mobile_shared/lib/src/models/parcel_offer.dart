import 'parcel.dart';

class ParcelOffer {
  final String attemptId;
  final String parcelId;
  final String trackingNumber;
  final String pickupAddress;
  final ParcelLocation pickupLocation;
  final String dropAddress;
  final ParcelLocation dropLocation;
  final String serviceType;
  final String packageCategory;
  final double weightKg;
  final double payoutInr;
  final String offerExpiresAt;

  String get dropoffAddress => dropAddress;
  double get partnerEarnings => payoutInr;

  const ParcelOffer({
    required this.attemptId,
    required this.parcelId,
    required this.trackingNumber,
    required this.pickupAddress,
    required this.pickupLocation,
    required this.dropAddress,
    required this.dropLocation,
    required this.serviceType,
    required this.packageCategory,
    required this.weightKg,
    required this.payoutInr,
    required this.offerExpiresAt,
  });

  factory ParcelOffer.fromJson(Map<String, dynamic> json) {
    return ParcelOffer(
      attemptId: json['attemptId'] as String? ?? json['attempt_id'] as String? ?? '',
      parcelId: json['parcelId'] as String? ?? json['parcel_id'] as String? ?? '',
      trackingNumber: json['trackingNumber'] as String? ?? json['tracking_number'] as String? ?? '',
      pickupAddress: json['pickupAddress'] as String? ?? json['pickup_address'] as String? ?? '',
      pickupLocation: ParcelLocation(
        latitude: (json['pickup_lat'] as num?)?.toDouble() ?? 0.0,
        longitude: (json['pickup_lon'] as num?)?.toDouble() ?? 0.0,
      ),
      dropAddress: json['dropAddress'] as String? ?? json['drop_address'] as String? ?? '',
      dropLocation: ParcelLocation(
        latitude: (json['dropoff_lat'] as num?)?.toDouble() ?? 0.0,
        longitude: (json['dropoff_lon'] as num?)?.toDouble() ?? 0.0,
      ),
      serviceType: json['serviceType'] as String? ?? json['service_type'] as String? ?? 'STANDARD',
      packageCategory: json['packageCategory'] as String? ?? json['package_category'] as String? ?? 'GENERAL',
      weightKg: (json['weightKg'] as num?)?.toDouble() ?? (json['estimated_weight_kg'] as num?)?.toDouble() ?? 1.0,
      payoutInr: (json['payoutInr'] as num?)?.toDouble() ?? (json['partner_payout_inr'] as num?)?.toDouble() ?? 0.0,
      offerExpiresAt: json['offerExpiresAt'] as String? ?? json['offer_expires_at'] as String? ?? '',
    );
  }
}
