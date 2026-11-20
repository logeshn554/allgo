class OptionItem {
  final String id;
  final String name;
  final double priceInr;
  final bool isAvailable;
  final int displayOrder;

  double get priceModifierInr => priceInr;

  const OptionItem({
    required this.id,
    required this.name,
    required this.priceInr,
    required this.isAvailable,
    required this.displayOrder,
  });

  factory OptionItem.fromJson(Map<String, dynamic> json) {
    return OptionItem(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      priceInr: (json['priceInr'] as num?)?.toDouble() ?? 0.0,
      isAvailable: json['isAvailable'] as bool? ?? true,
      displayOrder: (json['displayOrder'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'priceInr': priceInr,
    'isAvailable': isAvailable,
    'displayOrder': displayOrder,
  };
}

class OptionGroup {
  final String id;
  final String name;
  final int minSelections;
  final int maxSelections;
  final bool isRequired;
  final int displayOrder;
  final List<OptionItem> options;

  const OptionGroup({
    required this.id,
    required this.name,
    required this.minSelections,
    required this.maxSelections,
    required this.isRequired,
    required this.displayOrder,
    required this.options,
  });

  factory OptionGroup.fromJson(Map<String, dynamic> json) {
    return OptionGroup(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      minSelections: (json['minSelections'] as num?)?.toInt() ?? 0,
      maxSelections: (json['maxSelections'] as num?)?.toInt() ?? 1,
      isRequired: json['isRequired'] as bool? ?? false,
      displayOrder: (json['displayOrder'] as num?)?.toInt() ?? 0,
      options: (json['options'] as List<dynamic>?)
              ?.map((e) => OptionItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'minSelections': minSelections,
    'maxSelections': maxSelections,
    'isRequired': isRequired,
    'displayOrder': displayOrder,
    'options': options.map((e) => e.toJson()).toList(),
  };
}

class ProductVariant {
  final String id;
  final String variantName;
  final double additionalPriceInr;
  final double? salePriceInr;
  final String? sku;
  final String variantType;
  final int displayOrder;
  final bool isAvailable;

  const ProductVariant({
    required this.id,
    required this.variantName,
    required this.additionalPriceInr,
    this.salePriceInr,
    this.sku,
    required this.variantType,
    required this.displayOrder,
    required this.isAvailable,
  });

  factory ProductVariant.fromJson(Map<String, dynamic> json) {
    return ProductVariant(
      id: json['id'] as String? ?? '',
      variantName: json['variantName'] as String? ?? json['variant_name'] as String? ?? '',
      additionalPriceInr: (json['additionalPriceInr'] as num?)?.toDouble() ?? 0.0,
      salePriceInr: (json['salePriceInr'] as num?)?.toDouble(),
      sku: json['sku'] as String?,
      variantType: json['variantType'] as String? ?? 'SIZE',
      displayOrder: (json['displayOrder'] as num?)?.toInt() ?? 0,
      isAvailable: json['isAvailable'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'variantName': variantName,
    'additionalPriceInr': additionalPriceInr,
    'salePriceInr': salePriceInr,
    'sku': sku,
    'variantType': variantType,
    'displayOrder': displayOrder,
    'isAvailable': isAvailable,
  };
}
