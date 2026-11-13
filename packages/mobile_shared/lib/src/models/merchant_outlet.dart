class MerchantOutlet {
  final String id;
  final String merchantId;
  final String outletName;
  final String addressLine1;
  final String? addressLine2;
  final String postalCode;
  final double latitude;
  final double longitude;
  final String phone;
  final bool isOpen;
  final String outletStatus;
  final int defaultPrepTimeMinutes;
  final double packagingFeeInr;

  MerchantOutlet({
    required this.id,
    required this.merchantId,
    required this.outletName,
    required this.addressLine1,
    this.addressLine2,
    required this.postalCode,
    required this.latitude,
    required this.longitude,
    required this.phone,
    this.isOpen = false,
    this.outletStatus = 'PENDING_APPROVAL',
    this.defaultPrepTimeMinutes = 15,
    this.packagingFeeInr = 10.0,
  });

  factory MerchantOutlet.fromJson(Map<String, dynamic> json) {
    return MerchantOutlet(
      id: json['id']?.toString() ?? '',
      merchantId: json['merchant_id']?.toString() ?? '',
      outletName: json['outlet_name']?.toString() ?? '',
      addressLine1: json['address_line1']?.toString() ?? '',
      addressLine2: json['address_line2']?.toString(),
      postalCode: json['postal_code']?.toString() ?? '',
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      phone: json['phone']?.toString() ?? '',
      isOpen: json['is_open'] == true,
      outletStatus: json['outlet_status']?.toString() ?? 'PENDING_APPROVAL',
      defaultPrepTimeMinutes: (json['default_prep_time_minutes'] as num?)?.toInt() ?? 15,
      packagingFeeInr: (json['packaging_fee_inr'] as num?)?.toDouble() ?? 10.0,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'merchant_id': merchantId,
    'outlet_name': outletName,
    'address_line1': addressLine1,
    'address_line2': addressLine2,
    'postal_code': postalCode,
    'latitude': latitude,
    'longitude': longitude,
    'phone': phone,
    'is_open': isOpen,
    'outlet_status': outletStatus,
    'default_prep_time_minutes': defaultPrepTimeMinutes,
    'packaging_fee_inr': packagingFeeInr,
  };
}
