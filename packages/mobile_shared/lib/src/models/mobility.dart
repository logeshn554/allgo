class RideFareEstimateModel {
  final String vehicleCategory;
  final double estimatedDistanceKm;
  final int estimatedDurationMinutes;
  final double baseFareInr;
  final double distanceFareInr;
  final double timeFareInr;
  final double platformFeeInr;
  final double gstInr;
  final double totalFareInr;

  RideFareEstimateModel({
    required this.vehicleCategory,
    required this.estimatedDistanceKm,
    required this.estimatedDurationMinutes,
    required this.baseFareInr,
    required this.distanceFareInr,
    required this.timeFareInr,
    required this.platformFeeInr,
    required this.gstInr,
    required this.totalFareInr,
  });

  factory RideFareEstimateModel.fromJson(Map<String, dynamic> json) {
    return RideFareEstimateModel(
      vehicleCategory: json['vehicleCategory'] as String? ?? 'BIKE',
      estimatedDistanceKm: (json['estimatedDistanceKm'] as num?)?.toDouble() ?? 0.0,
      estimatedDurationMinutes: (json['estimatedDurationMinutes'] as num?)?.toInt() ?? 0,
      baseFareInr: (json['baseFareInr'] as num?)?.toDouble() ?? 0.0,
      distanceFareInr: (json['distanceFareInr'] as num?)?.toDouble() ?? 0.0,
      timeFareInr: (json['timeFareInr'] as num?)?.toDouble() ?? 0.0,
      platformFeeInr: (json['platformFeeInr'] as num?)?.toDouble() ?? 0.0,
      gstInr: (json['gstInr'] as num?)?.toDouble() ?? 0.0,
      totalFareInr: (json['totalFareInr'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class RideModel {
  final String id;
  final String rideNumber;
  final String vehicleCategory;
  final String status;
  final String pickupAddress;
  final String dropoffAddress;
  final double totalFareInr;
  final String? startOtp;
  final String? driverName;
  final String? driverPhone;
  final String? driverVehicle;
  final String? createdAt;

  RideModel({
    required this.id,
    required this.rideNumber,
    required this.vehicleCategory,
    required this.status,
    required this.pickupAddress,
    required this.dropoffAddress,
    required this.totalFareInr,
    this.startOtp,
    this.driverName,
    this.driverPhone,
    this.driverVehicle,
    this.createdAt,
  });

  factory RideModel.fromJson(Map<String, dynamic> json) {
    final driver = json['driver'] as Map<String, dynamic>?;
    return RideModel(
      id: json['id'] as String? ?? '',
      rideNumber: json['rideNumber'] as String? ?? json['ride_number'] as String? ?? '',
      vehicleCategory: json['vehicleCategory'] as String? ?? json['ride_type'] as String? ?? 'BIKE',
      status: json['status'] as String? ?? 'REQUESTED',
      pickupAddress: json['pickupAddress'] as String? ?? json['pickup_address'] as String? ?? '',
      dropoffAddress: json['dropoffAddress'] as String? ?? json['drop_address'] as String? ?? '',
      totalFareInr: (json['totalFareInr'] as num?)?.toDouble() ??
          (json['total_fare_inr'] as num?)?.toDouble() ??
          0.0,
      startOtp: json['startOtp'] as String? ?? json['start_otp'] as String?,
      driverName: driver?['name'] as String?,
      driverPhone: driver?['phone'] as String?,
      driverVehicle: driver?['vehicle'] as String?,
      createdAt: json['createdAt'] as String? ?? json['created_at'] as String?,
    );
  }
}

class ParcelModel {
  final String id;
  final String parcelNumber;
  final String packageCategory;
  final double weightKg;
  final String status;
  final String pickupAddress;
  final String dropoffAddress;
  final double totalAmountInr;
  final String? pickupOtp;
  final String? deliveryOtp;
  final String? courierName;
  final String? courierPhone;
  final String? createdAt;

  ParcelModel({
    required this.id,
    required this.parcelNumber,
    required this.packageCategory,
    required this.weightKg,
    required this.status,
    required this.pickupAddress,
    required this.dropoffAddress,
    required this.totalAmountInr,
    this.pickupOtp,
    this.deliveryOtp,
    this.courierName,
    this.courierPhone,
    this.createdAt,
  });

  factory ParcelModel.fromJson(Map<String, dynamic> json) {
    final courier = json['courier'] as Map<String, dynamic>?;
    return ParcelModel(
      id: json['id'] as String? ?? '',
      parcelNumber: json['parcelNumber'] as String? ?? json['parcel_number'] as String? ?? '',
      packageCategory: json['packageCategory'] as String? ?? json['package_category'] as String? ?? 'GENERAL',
      weightKg: (json['weightKg'] as num?)?.toDouble() ??
          (json['estimated_weight_kg'] as num?)?.toDouble() ??
          1.0,
      status: json['status'] as String? ?? 'CREATED',
      pickupAddress: json['pickupAddress'] as String? ?? json['pickup_address'] as String? ?? '',
      dropoffAddress: json['dropoffAddress'] as String? ?? json['drop_address'] as String? ?? '',
      totalAmountInr: (json['totalAmountInr'] as num?)?.toDouble() ??
          (json['total_amount_inr'] as num?)?.toDouble() ??
          0.0,
      pickupOtp: json['pickupOtp'] as String? ?? json['pickup_otp'] as String?,
      deliveryOtp: json['deliveryOtp'] as String? ?? json['delivery_otp'] as String?,
      courierName: courier?['name'] as String?,
      courierPhone: courier?['phone'] as String?,
      createdAt: json['createdAt'] as String? ?? json['created_at'] as String?,
    );
  }
}

class HireDriverBookingModel {
  final String id;
  final String bookingNumber;
  final int durationHours;
  final String transmission;
  final String status;
  final String pickupAddress;
  final String scheduledStartTime;
  final double totalAmountInr;
  final String? startOtp;
  final String? endOtp;
  final String? driverName;
  final String? driverPhone;
  final String? createdAt;

  HireDriverBookingModel({
    required this.id,
    required this.bookingNumber,
    required this.durationHours,
    required this.transmission,
    required this.status,
    required this.pickupAddress,
    required this.scheduledStartTime,
    required this.totalAmountInr,
    this.startOtp,
    this.endOtp,
    this.driverName,
    this.driverPhone,
    this.createdAt,
  });

  factory HireDriverBookingModel.fromJson(Map<String, dynamic> json) {
    final driver = json['driver'] as Map<String, dynamic>?;
    return HireDriverBookingModel(
      id: json['id'] as String? ?? '',
      bookingNumber: json['bookingNumber'] as String? ?? json['booking_number'] as String? ?? '',
      durationHours: (json['durationHours'] as num?)?.toInt() ??
          (json['duration_hours'] as num?)?.toInt() ??
          4,
      transmission: json['transmission'] as String? ?? json['vehicle_transmission'] as String? ?? 'MANUAL',
      status: json['status'] as String? ?? 'BOOKED',
      pickupAddress: json['pickupAddress'] as String? ?? json['pickup_address'] as String? ?? '',
      scheduledStartTime: json['scheduledStartTime'] as String? ?? json['scheduled_start_time'] as String? ?? '',
      totalAmountInr: (json['totalAmountInr'] as num?)?.toDouble() ??
          (json['total_amount_inr'] as num?)?.toDouble() ??
          0.0,
      startOtp: json['startOtp'] as String? ?? json['start_otp'] as String?,
      endOtp: json['endOtp'] as String? ?? json['end_otp'] as String?,
      driverName: driver?['name'] as String?,
      driverPhone: driver?['phone'] as String?,
      createdAt: json['createdAt'] as String? ?? json['created_at'] as String?,
    );
  }
}

class PartnerModeConfigModel {
  final String partnerId;
  final String preferredMode;
  final String? activeVerticalLock;
  final bool isOnline;

  PartnerModeConfigModel({
    required this.partnerId,
    required this.preferredMode,
    this.activeVerticalLock,
    this.isOnline = false,
  });

  factory PartnerModeConfigModel.fromJson(Map<String, dynamic> json) {
    return PartnerModeConfigModel(
      partnerId: json['partnerId'] as String? ?? '',
      preferredMode: json['preferredMode'] as String? ?? json['current_mode'] as String? ?? 'DELIVERIES_ONLY',
      activeVerticalLock: json['activeVerticalLock'] as String? ?? json['active_vertical_lock'] as String?,
      isOnline: json['isOnline'] as bool? ?? json['is_online'] as bool? ?? false,
    );
  }
}

class RideOfferModel {
  final String attemptId;
  final String rideId;
  final String rideNumber;
  final String rideType;
  final String serviceType;
  final String pickupAddress;
  final String dropoffAddress;
  final double totalFareInr;
  final double partnerPayoutInr;
  final double estimatedDistanceKm;
  final String offerExpiresAt;

  RideOfferModel({
    required this.attemptId,
    required this.rideId,
    required this.rideNumber,
    required this.rideType,
    required this.serviceType,
    required this.pickupAddress,
    required this.dropoffAddress,
    required this.totalFareInr,
    required this.partnerPayoutInr,
    required this.estimatedDistanceKm,
    required this.offerExpiresAt,
  });

  factory RideOfferModel.fromJson(Map<String, dynamic> json) {
    return RideOfferModel(
      attemptId: json['attemptId'] as String? ?? json['id'] as String? ?? '',
      rideId: json['rideId'] as String? ?? json['ride_id'] as String? ?? '',
      rideNumber: json['rideNumber'] as String? ?? json['ride_number'] as String? ?? '',
      rideType: json['rideType'] as String? ?? json['ride_type'] as String? ?? 'CAB',
      serviceType: json['serviceType'] as String? ?? json['service_type'] as String? ?? 'CAB',
      pickupAddress: json['pickupAddress'] as String? ?? json['pickup_address'] as String? ?? '',
      dropoffAddress: json['dropoffAddress'] as String? ?? json['drop_address'] as String? ?? '',
      totalFareInr: (json['totalFareInr'] as num?)?.toDouble() ?? (json['total_fare_inr'] as num?)?.toDouble() ?? 0.0,
      partnerPayoutInr: (json['partnerPayoutInr'] as num?)?.toDouble() ?? (json['partner_payout_inr'] as num?)?.toDouble() ?? 0.0,
      estimatedDistanceKm: (json['estimatedDistanceKm'] as num?)?.toDouble() ?? (json['estimated_distance_km'] as num?)?.toDouble() ?? 0.0,
      offerExpiresAt: json['offerExpiresAt'] as String? ?? json['offer_expires_at'] as String? ?? '',
    );
  }
}
