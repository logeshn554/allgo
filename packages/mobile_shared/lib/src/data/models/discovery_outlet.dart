class DiscoveryOutlet {
  final String id;
  final String merchantId;
  final String outletName;
  final String? address;
  final String? phone;
  final String outletStatus;
  final bool isOpen;
  final double? latitude;
  final double? longitude;
  final String businessName;
  final String? merchantType;
  final double distanceKm;

  DiscoveryOutlet({
    required this.id,
    required this.merchantId,
    required this.outletName,
    this.address,
    this.phone,
    required this.outletStatus,
    required this.isOpen,
    this.latitude,
    this.longitude,
    required this.businessName,
    this.merchantType,
    this.distanceKm = 0.0,
  });

  factory DiscoveryOutlet.fromJson(Map<String, dynamic> json) {
    return DiscoveryOutlet(
      id: json['id']?.toString() ?? '',
      merchantId: json['merchant_id']?.toString() ?? '',
      outletName: json['outlet_name']?.toString() ?? '',
      address: json['address']?.toString() ?? json['address_line1']?.toString(),
      phone: json['phone']?.toString(),
      outletStatus: json['outlet_status']?.toString() ?? 'ACTIVE',
      isOpen: json['is_open'] as bool? ?? true,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      businessName: json['business_name']?.toString() ?? '',
      merchantType: json['merchant_type']?.toString(),
      distanceKm: (json['distance_km'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class DiscoveryCategory {
  final String id;
  final String name;
  final String verticalType;

  DiscoveryCategory({
    required this.id,
    required this.name,
    required this.verticalType,
  });

  factory DiscoveryCategory.fromJson(Map<String, dynamic> json) {
    return DiscoveryCategory(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      verticalType: json['vertical_type']?.toString() ?? 'FOOD',
    );
  }
}
