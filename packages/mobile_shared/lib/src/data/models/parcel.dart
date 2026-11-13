class ParcelLocation {
  final double latitude;
  final double longitude;

  const ParcelLocation({
    required this.latitude,
    required this.longitude,
  });

  factory ParcelLocation.fromJson(Map<String, dynamic> json) {
    return ParcelLocation(
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
        'latitude': latitude,
        'longitude': longitude,
      };
}

class ParcelEvent {
  final String eventType;
  final String? fromStatus;
  final String? toStatus;
  final String? actorRole;
  final String? reason;
  final String createdAt;

  const ParcelEvent({
    required this.eventType,
    this.fromStatus,
    this.toStatus,
    this.actorRole,
    this.reason,
    required this.createdAt,
  });

  factory ParcelEvent.fromJson(Map<String, dynamic> json) {
    return ParcelEvent(
      eventType: json['eventType'] as String? ?? json['event_type'] as String? ?? '',
      fromStatus: json['fromStatus'] as String? ?? json['from_status'] as String?,
      toStatus: json['toStatus'] as String? ?? json['to_status'] as String?,
      actorRole: json['actorRole'] as String? ?? json['actor_role'] as String?,
      reason: json['reason'] as String?,
      createdAt: json['createdAt'] as String? ?? json['created_at'] as String? ?? '',
    );
  }
}

class ParcelPartnerInfo {
  final String id;
  final String name;
  final String? phone;
  final double? latitude;
  final double? longitude;

  const ParcelPartnerInfo({
    required this.id,
    required this.name,
    this.phone,
    this.latitude,
    this.longitude,
  });

  factory ParcelPartnerInfo.fromJson(Map<String, dynamic> json) {
    return ParcelPartnerInfo(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Courier Partner',
      phone: json['phone'] as String?,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
    );
  }
}

class ParcelModel {
  final String id;
  final String trackingNumber;
  final String status;
  final String serviceType;
  final String pickupAddress;
  final ParcelLocation pickupLocation;
  final String dropAddress;
  final ParcelLocation dropLocation;
  final String senderName;
  final String senderPhone;
  final String recipientName;
  final String recipientPhone;
  final String packageDescription;
  final String packageCategory;
  final double weightKg;
  final double? lengthCm;
  final double? widthCm;
  final double? heightCm;
  final double? declaredValueInr;
  final String? handlingInstructions;
  final double totalAmountInr;
  final double deliveryFeeInr;
  final String paymentStatus;
  final String? pickupOtp;
  final String? deliveryOtp;
  final ParcelPartnerInfo? partner;
  final List<ParcelEvent> events;
  final String? createdAt;

  const ParcelModel({
    required this.id,
    required this.trackingNumber,
    required this.status,
    required this.serviceType,
    required this.pickupAddress,
    required this.pickupLocation,
    required this.dropAddress,
    required this.dropLocation,
    required this.senderName,
    required this.senderPhone,
    required this.recipientName,
    required this.recipientPhone,
    required this.packageDescription,
    required this.packageCategory,
    required this.weightKg,
    this.lengthCm,
    this.widthCm,
    this.heightCm,
    this.declaredValueInr,
    this.handlingInstructions,
    required this.totalAmountInr,
    required this.deliveryFeeInr,
    required this.paymentStatus,
    this.pickupOtp,
    this.deliveryOtp,
    this.partner,
    this.events = const [],
    this.createdAt,
  });

  factory ParcelModel.fromJson(Map<String, dynamic> json) {
    return ParcelModel(
      id: json['id'] as String? ?? '',
      trackingNumber: json['trackingNumber'] as String? ??
          json['tracking_number'] as String? ??
          json['parcelNumber'] as String? ??
          json['parcel_number'] as String? ??
          '',
      status: json['status'] as String? ?? 'BOOKED',
      serviceType: json['serviceType'] as String? ?? json['service_type'] as String? ?? 'STANDARD',
      pickupAddress: json['pickupAddress'] as String? ?? json['pickup_address'] as String? ?? '',
      pickupLocation: json['pickupLocation'] != null
          ? ParcelLocation.fromJson(json['pickupLocation'] as Map<String, dynamic>)
          : ParcelLocation(
              latitude: (json['pickup_lat'] as num?)?.toDouble() ?? 0.0,
              longitude: (json['pickup_lon'] as num?)?.toDouble() ?? 0.0,
            ),
      dropAddress: json['dropAddress'] as String? ?? json['drop_address'] as String? ?? '',
      dropLocation: json['dropLocation'] != null
          ? ParcelLocation.fromJson(json['dropLocation'] as Map<String, dynamic>)
          : ParcelLocation(
              latitude: (json['dropoff_lat'] as num?)?.toDouble() ?? 0.0,
              longitude: (json['dropoff_lon'] as num?)?.toDouble() ?? 0.0,
            ),
      senderName: json['senderName'] as String? ??
          json['sender_name'] as String? ??
          json['pickup_contact_name'] as String? ??
          json['pickupContactName'] as String? ??
          '',
      senderPhone: json['senderPhone'] as String? ??
          json['pickup_contact_phone'] as String? ??
          json['pickupContactPhone'] as String? ??
          json['sender_phone'] as String? ??
          '',
      recipientName: json['recipientName'] as String? ??
          json['recipient_name'] as String? ??
          json['drop_contact_name'] as String? ??
          json['dropContactName'] as String? ??
          '',
      recipientPhone: json['recipientPhone'] as String? ??
          json['recipient_phone'] as String? ??
          json['drop_contact_phone'] as String? ??
          json['dropContactPhone'] as String? ??
          '',
      packageDescription: json['packageDescription'] as String? ?? json['package_description'] as String? ?? '',
      packageCategory: json['packageCategory'] as String? ?? json['package_category'] as String? ?? 'GENERAL',
      weightKg: (json['weightKg'] as num?)?.toDouble() ?? (json['estimated_weight_kg'] as num?)?.toDouble() ?? 1.0,
      lengthCm: (json['lengthCm'] as num?)?.toDouble() ?? (json['length_cm'] as num?)?.toDouble(),
      widthCm: (json['widthCm'] as num?)?.toDouble() ?? (json['width_cm'] as num?)?.toDouble(),
      heightCm: (json['heightCm'] as num?)?.toDouble() ?? (json['height_cm'] as num?)?.toDouble(),
      declaredValueInr: (json['declaredValueInr'] as num?)?.toDouble() ?? (json['declared_value_inr'] as num?)?.toDouble(),
      handlingInstructions: json['handlingInstructions'] as String? ?? json['handling_instructions'] as String?,
      totalAmountInr: (json['totalAmountInr'] as num?)?.toDouble() ?? (json['total_amount_inr'] as num?)?.toDouble() ?? 0.0,
      deliveryFeeInr: (json['deliveryFeeInr'] as num?)?.toDouble() ?? (json['delivery_fee_inr'] as num?)?.toDouble() ?? 0.0,
      paymentStatus: json['paymentStatus'] as String? ?? json['payment_status'] as String? ?? 'PENDING',
      pickupOtp: json['pickupOtp'] as String? ?? json['pickup_otp'] as String?,
      deliveryOtp: json['deliveryOtp'] as String? ?? json['delivery_otp'] as String?,
      partner: json['partner'] != null
          ? ParcelPartnerInfo.fromJson(json['partner'] as Map<String, dynamic>)
          : (json['courier'] != null
              ? ParcelPartnerInfo.fromJson(json['courier'] as Map<String, dynamic>)
              : null),
      events: (json['events'] as List<dynamic>?)
              ?.map((e) => ParcelEvent.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      createdAt: json['createdAt'] as String? ?? json['created_at'] as String?,
    );
  }
}
