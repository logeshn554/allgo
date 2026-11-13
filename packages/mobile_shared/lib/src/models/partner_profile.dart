class PartnerProfile {
  final String id;
  final String status;
  final String? bankAccountMasked;
  final String? bankIfsc;
  final String? bankBeneficiaryName;
  final bool backgroundChecked;
  final bool equipmentVerified;
  final Map<String, dynamic>? vehicle;
  final List<dynamic> services;
  final List<dynamic> documents;

  PartnerProfile({
    required this.id,
    required this.status,
    this.bankAccountMasked,
    this.bankIfsc,
    this.bankBeneficiaryName,
    this.backgroundChecked = false,
    this.equipmentVerified = false,
    this.vehicle,
    this.services = const [],
    this.documents = const [],
  });

  factory PartnerProfile.fromJson(Map<String, dynamic> json) {
    final partner = json['partner'] as Map<String, dynamic>? ?? json;
    return PartnerProfile(
      id: partner['id']?.toString() ?? '',
      status: partner['status']?.toString() ?? 'REGISTERED',
      bankAccountMasked: partner['bankAccountMasked']?.toString(),
      bankIfsc: partner['bankIfsc']?.toString(),
      bankBeneficiaryName: partner['bankBeneficiaryName']?.toString(),
      backgroundChecked: partner['backgroundChecked'] == true,
      equipmentVerified: partner['equipmentVerified'] == true,
      vehicle: json['vehicle'] as Map<String, dynamic>?,
      services: json['services'] as List<dynamic>? ?? [],
      documents: json['documents'] as List<dynamic>? ?? [],
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'status': status,
    'bankAccountMasked': bankAccountMasked,
    'bankIfsc': bankIfsc,
    'bankBeneficiaryName': bankBeneficiaryName,
    'backgroundChecked': backgroundChecked,
    'equipmentVerified': equipmentVerified,
    'vehicle': vehicle,
    'services': services,
    'documents': documents,
  };
}
