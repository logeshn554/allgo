class DeliveryCoordinates {
  final double latitude;
  final double longitude;

  const DeliveryCoordinates({
    required this.latitude,
    required this.longitude,
  });

  factory DeliveryCoordinates.fromJson(Map<String, dynamic> json) {
    return DeliveryCoordinates(
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
        'latitude': latitude,
        'longitude': longitude,
      };
}

class DeliveryLiveLocation {
  final double latitude;
  final double longitude;
  final double? heading;
  final double? speedMps;
  final String? recordedAt;

  const DeliveryLiveLocation({
    required this.latitude,
    required this.longitude,
    this.heading,
    this.speedMps,
    this.recordedAt,
  });

  factory DeliveryLiveLocation.fromJson(Map<String, dynamic> json) {
    return DeliveryLiveLocation(
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      heading: (json['heading'] as num?)?.toDouble(),
      speedMps: (json['speedMps'] as num?)?.toDouble(),
      recordedAt: json['recordedAt'] as String?,
    );
  }
}

class AssignedPartnerInfo {
  final String id;
  final String name;
  final String? phone;
  final DeliveryLiveLocation? liveLocation;

  const AssignedPartnerInfo({
    required this.id,
    required this.name,
    this.phone,
    this.liveLocation,
  });

  factory AssignedPartnerInfo.fromJson(Map<String, dynamic> json) {
    return AssignedPartnerInfo(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      phone: json['phone'] as String?,
      liveLocation: json['liveLocation'] != null
          ? DeliveryLiveLocation.fromJson(json['liveLocation'] as Map<String, dynamic>)
          : null,
    );
  }
}

class DeliveryJobModel {
  final String id;
  final String jobNumber;
  final String verticalType;
  final String status;
  final String? outletName;
  final String pickupAddress;
  final DeliveryCoordinates? pickupLocation;
  final String dropoffAddress;
  final DeliveryCoordinates? dropoffLocation;
  final String? handoverOtp;
  final String? deliveryPin;
  final String? customerName;
  final AssignedPartnerInfo? assignedPartner;
  final double courierFeeInr;
  final int? estimatedPrepTimeMinutes;
  final String? createdAt;
  final String? completedAt;

  const DeliveryJobModel({
    required this.id,
    required this.jobNumber,
    required this.verticalType,
    required this.status,
    this.outletName,
    required this.pickupAddress,
    this.pickupLocation,
    required this.dropoffAddress,
    this.dropoffLocation,
    this.handoverOtp,
    this.deliveryPin,
    this.customerName,
    this.assignedPartner,
    required this.courierFeeInr,
    this.estimatedPrepTimeMinutes,
    this.createdAt,
    this.completedAt,
  });

  factory DeliveryJobModel.fromJson(Map<String, dynamic> json) {
    return DeliveryJobModel(
      id: json['id'] as String? ?? '',
      jobNumber: json['jobNumber'] as String? ?? json['job_number'] as String? ?? '',
      verticalType: json['verticalType'] as String? ?? json['vertical_type'] as String? ?? 'FOOD',
      status: json['status'] as String? ?? 'DISPATCH_PENDING',
      outletName: json['outletName'] as String? ?? json['outlet_name'] as String?,
      pickupAddress: json['pickupAddress'] as String? ?? json['pickup_address'] as String? ?? '',
      pickupLocation: json['pickupLocation'] != null
          ? DeliveryCoordinates.fromJson(json['pickupLocation'] as Map<String, dynamic>)
          : (json['pickup_location'] != null
              ? DeliveryCoordinates.fromJson(json['pickup_location'] as Map<String, dynamic>)
              : null),
      dropoffAddress: json['dropoffAddress'] as String? ?? json['dropoff_address'] as String? ?? '',
      dropoffLocation: json['dropoffLocation'] != null
          ? DeliveryCoordinates.fromJson(json['dropoffLocation'] as Map<String, dynamic>)
          : (json['dropoff_location'] != null
              ? DeliveryCoordinates.fromJson(json['dropoff_location'] as Map<String, dynamic>)
              : null),
      handoverOtp: json['handoverOtp'] as String? ?? json['handover_otp'] as String?,
      deliveryPin: json['deliveryPin'] as String? ?? json['delivery_pin'] as String?,
      customerName: json['customerName'] as String? ?? json['customer_name'] as String?,
      assignedPartner: json['assignedPartner'] != null
          ? AssignedPartnerInfo.fromJson(json['assignedPartner'] as Map<String, dynamic>)
          : null,
      courierFeeInr: (json['courierFeeInr'] as num?)?.toDouble() ??
          (json['courier_fee_inr'] as num?)?.toDouble() ??
          0.0,
      estimatedPrepTimeMinutes: (json['estimatedPrepTimeMinutes'] as num?)?.toInt() ??
          (json['estimated_prep_time_minutes'] as num?)?.toInt(),
      createdAt: json['createdAt'] as String? ?? json['created_at'] as String?,
      completedAt: json['completedAt'] as String? ?? json['completed_at'] as String?,
    );
  }
}

class DeliveryOfferModel {
  final String attemptId;
  final String jobId;
  final String jobNumber;
  final String verticalType;
  final String pickupAddress;
  final String dropoffAddress;
  final double courierFeeInr;
  final double surgeFeeInr;
  final double? distanceMeters;
  final int expiresAtSeconds;

  const DeliveryOfferModel({
    required this.attemptId,
    required this.jobId,
    required this.jobNumber,
    required this.verticalType,
    required this.pickupAddress,
    required this.dropoffAddress,
    required this.courierFeeInr,
    required this.surgeFeeInr,
    this.distanceMeters,
    required this.expiresAtSeconds,
  });

  factory DeliveryOfferModel.fromJson(Map<String, dynamic> json) {
    return DeliveryOfferModel(
      attemptId: json['attemptId'] as String? ?? json['attempt_id'] as String? ?? '',
      jobId: json['jobId'] as String? ?? json['job_id'] as String? ?? '',
      jobNumber: json['jobNumber'] as String? ?? json['job_number'] as String? ?? '',
      verticalType: json['verticalType'] as String? ?? json['vertical_type'] as String? ?? 'FOOD',
      pickupAddress: json['pickupAddress'] as String? ?? json['pickup_address'] as String? ?? '',
      dropoffAddress: json['dropoffAddress'] as String? ?? json['dropoff_address'] as String? ?? '',
      courierFeeInr: (json['courierFeeInr'] as num?)?.toDouble() ??
          (json['courier_fee_inr'] as num?)?.toDouble() ??
          0.0,
      surgeFeeInr: (json['surgeFeeInr'] as num?)?.toDouble() ??
          (json['surge_fee_inr'] as num?)?.toDouble() ??
          0.0,
      distanceMeters: (json['distanceMeters'] as num?)?.toDouble(),
      expiresAtSeconds: (json['expiresAtSeconds'] as num?)?.toInt() ?? 45,
    );
  }
}

class PartnerEarningsModel {
  final String id;
  final String deliveryJobId;
  final String earningType;
  final double baseAmountInr;
  final double surgeAmountInr;
  final double tipAmountInr;
  final double netAmountInr;
  final String currency;
  final String recordedAt;

  const PartnerEarningsModel({
    required this.id,
    required this.deliveryJobId,
    required this.earningType,
    required this.baseAmountInr,
    required this.surgeAmountInr,
    required this.tipAmountInr,
    required this.netAmountInr,
    required this.currency,
    required this.recordedAt,
  });

  factory PartnerEarningsModel.fromJson(Map<String, dynamic> json) {
    return PartnerEarningsModel(
      id: json['id'] as String? ?? '',
      deliveryJobId: json['delivery_job_id'] as String? ?? json['deliveryJobId'] as String? ?? '',
      earningType: json['earning_type'] as String? ?? json['earningType'] as String? ?? 'DELIVERY_BASE',
      baseAmountInr: (json['base_amount_inr'] as num?)?.toDouble() ??
          (json['baseAmountInr'] as num?)?.toDouble() ??
          0.0,
      surgeAmountInr: (json['surge_amount_inr'] as num?)?.toDouble() ??
          (json['surgeAmountInr'] as num?)?.toDouble() ??
          0.0,
      tipAmountInr: (json['tip_amount_inr'] as num?)?.toDouble() ??
          (json['tipAmountInr'] as num?)?.toDouble() ??
          0.0,
      netAmountInr: (json['net_amount_inr'] as num?)?.toDouble() ??
          (json['netAmountInr'] as num?)?.toDouble() ??
          0.0,
      currency: json['currency'] as String? ?? 'INR',
      recordedAt: json['recorded_at'] as String? ?? json['recordedAt'] as String? ?? '',
    );
  }
}
