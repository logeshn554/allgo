class MerchantProfile {
  final String id;
  final String ownerId;
  final String businessName;
  final String? tradeName;
  final String merchantType;
  final String panNumber;
  final String? gstin;
  final String? fssaiLicenseNumber;
  final String status;
  final String? bankAccountNumber;
  final String? bankIfsc;
  final String? bankBeneficiaryName;
  final double commissionRatePercentage;
  final String createdAt;

  const MerchantProfile({
    required this.id,
    required this.ownerId,
    required this.businessName,
    this.tradeName,
    required this.merchantType,
    required this.panNumber,
    this.gstin,
    this.fssaiLicenseNumber,
    required this.status,
    this.bankAccountNumber,
    this.bankIfsc,
    this.bankBeneficiaryName,
    this.commissionRatePercentage = 15.0,
    required this.createdAt,
  });

  factory MerchantProfile.fromJson(Map<String, dynamic> json) {
    return MerchantProfile(
      id: json['id'] as String? ?? '',
      ownerId: json['owner_id'] as String? ?? '',
      businessName: json['business_name'] as String? ?? '',
      tradeName: json['trade_name'] as String?,
      merchantType: json['merchant_type'] as String? ?? 'RESTAURANT',
      panNumber: json['pan_number'] as String? ?? '',
      gstin: json['gstin'] as String?,
      fssaiLicenseNumber: json['fssai_license_number'] as String?,
      status: json['status'] as String? ?? 'SUBMITTED',
      bankAccountNumber: json['bank_account_number'] as String?,
      bankIfsc: json['bank_ifsc'] as String?,
      bankBeneficiaryName: json['bank_beneficiary_name'] as String?,
      commissionRatePercentage: (json['commission_rate_percentage'] as num?)?.toDouble() ?? 15.0,
      createdAt: json['created_at'] as String? ?? '',
    );
  }
}

class Outlet {
  final String id;
  final String merchantId;
  final String outletName;
  final String addressLine1;
  final String? addressLine2;
  final String postalCode;
  final double latitude;
  final double longitude;
  final bool isOpen;
  final int defaultPrepTimeMinutes;
  final double packagingFeeInr;
  final String phone;

  const Outlet({
    required this.id,
    required this.merchantId,
    required this.outletName,
    required this.addressLine1,
    this.addressLine2,
    required this.postalCode,
    required this.latitude,
    required this.longitude,
    required this.isOpen,
    required this.defaultPrepTimeMinutes,
    required this.packagingFeeInr,
    required this.phone,
  });

  factory Outlet.fromJson(Map<String, dynamic> json) {
    return Outlet(
      id: json['id'] as String? ?? '',
      merchantId: json['merchant_id'] as String? ?? '',
      outletName: json['outlet_name'] as String? ?? '',
      addressLine1: json['address_line1'] as String? ?? '',
      addressLine2: json['address_line2'] as String?,
      postalCode: json['postal_code'] as String? ?? '',
      latitude: (json['latitude'] as num?)?.toDouble() ?? 13.0827,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 80.2707,
      isOpen: json['is_open'] as bool? ?? true,
      defaultPrepTimeMinutes: (json['default_prep_time_minutes'] as num?)?.toInt() ?? 15,
      packagingFeeInr: (json['packaging_fee_inr'] as num?)?.toDouble() ?? 10.0,
      phone: json['phone'] as String? ?? '',
    );
  }
}

