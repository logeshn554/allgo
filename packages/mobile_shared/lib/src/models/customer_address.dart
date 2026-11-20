class CustomerAddressModel {
  final String id;
  final String label;
  final String recipientName;
  final String recipientPhone;
  final String addressLine1;
  final String? addressLine2;
  final String? landmark;
  final String city;
  final String state;
  final String postalCode;
  final double latitude;
  final double longitude;
  final bool isDefault;

  const CustomerAddressModel({
    required this.id,
    required this.label,
    required this.recipientName,
    required this.recipientPhone,
    required this.addressLine1,
    this.addressLine2,
    this.landmark,
    required this.city,
    this.state = 'Tamil Nadu',
    required this.postalCode,
    required this.latitude,
    required this.longitude,
    this.isDefault = false,
  });

  factory CustomerAddressModel.fromJson(Map<String, dynamic> json) {
    return CustomerAddressModel(
      id: json['id'] as String? ?? '',
      label: json['label'] as String? ?? 'HOME',
      recipientName: json['recipientName'] as String? ?? json['recipient_name'] as String? ?? '',
      recipientPhone: json['recipientPhone'] as String? ?? json['recipient_phone'] as String? ?? '',
      addressLine1: json['addressLine1'] as String? ?? json['address_line1'] as String? ?? '',
      addressLine2: json['addressLine2'] as String? ?? json['address_line2'] as String?,
      landmark: json['landmark'] as String?,
      city: json['city'] as String? ?? 'Chennai',
      state: json['state'] as String? ?? 'Tamil Nadu',
      postalCode: json['postalCode'] as String? ?? json['postal_code'] as String? ?? '',
      latitude: (json['latitude'] as num?)?.toDouble() ?? 13.0827,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 80.2707,
      isDefault: json['isDefault'] as bool? ?? json['is_default'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
    'label': label,
    'recipientName': recipientName,
    'recipientPhone': recipientPhone,
    'addressLine1': addressLine1,
    'addressLine2': addressLine2,
    'landmark': landmark,
    'city': city,
    'state': state,
    'postalCode': postalCode,
    'latitude': latitude,
    'longitude': longitude,
    'isDefault': isDefault,
  };

  CustomerAddressModel copyWith({
    String? id,
    String? label,
    String? recipientName,
    String? recipientPhone,
    String? addressLine1,
    String? addressLine2,
    String? landmark,
    String? city,
    String? state,
    String? postalCode,
    double? latitude,
    double? longitude,
    bool? isDefault,
  }) {
    return CustomerAddressModel(
      id: id ?? this.id,
      label: label ?? this.label,
      recipientName: recipientName ?? this.recipientName,
      recipientPhone: recipientPhone ?? this.recipientPhone,
      addressLine1: addressLine1 ?? this.addressLine1,
      addressLine2: addressLine2 ?? this.addressLine2,
      landmark: landmark ?? this.landmark,
      city: city ?? this.city,
      state: state ?? this.state,
      postalCode: postalCode ?? this.postalCode,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      isDefault: isDefault ?? this.isDefault,
    );
  }
}
