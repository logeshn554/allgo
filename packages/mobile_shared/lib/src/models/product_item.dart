import 'option_group.dart';

class ProductItem {
  final String id;
  final String categoryId;
  final String categoryName;
  final String name;
  final String? description;
  final double basePriceInr;
  final double? salePriceInr;
  final double effectivePriceInr;
  final String? sku;
  final String? barcode;
  final bool isVeg;
  final bool isPerishable;
  final int preparationTimeMinutes;
  final String? imageUrl;
  final List<String> images;
  final int stockQuantity;
  final bool isInStock;
  final int lowStockThreshold;
  final String productStatus;
  final String adminStatus;
  final String? rejectionReason;
  final int displayOrder;
  final Map<String, dynamic> dietaryFlags;
  final bool outletIsAvailable;
  final List<ProductVariant> variants;
  final List<OptionGroup> optionGroups;

  const ProductItem({
    required this.id,
    required this.categoryId,
    required this.categoryName,
    required this.name,
    this.description,
    required this.basePriceInr,
    this.salePriceInr,
    required this.effectivePriceInr,
    this.sku,
    this.barcode,
    required this.isVeg,
    required this.isPerishable,
    required this.preparationTimeMinutes,
    this.imageUrl,
    this.images = const [],
    required this.stockQuantity,
    required this.isInStock,
    required this.lowStockThreshold,
    this.productStatus = 'ACTIVE',
    this.adminStatus = 'APPROVED',
    this.rejectionReason,
    this.displayOrder = 0,
    this.dietaryFlags = const {},
    this.outletIsAvailable = true,
    this.variants = const [],
    this.optionGroups = const [],
  });

  ProductItem copyWith({
    String? id,
    String? categoryId,
    String? categoryName,
    String? name,
    String? description,
    double? basePriceInr,
    double? salePriceInr,
    double? effectivePriceInr,
    String? sku,
    String? barcode,
    bool? isVeg,
    bool? isPerishable,
    int? preparationTimeMinutes,
    String? imageUrl,
    List<String>? images,
    int? stockQuantity,
    bool? isInStock,
    int? lowStockThreshold,
    String? productStatus,
    String? adminStatus,
    String? rejectionReason,
    int? displayOrder,
    Map<String, dynamic>? dietaryFlags,
    bool? outletIsAvailable,
    List<ProductVariant>? variants,
    List<OptionGroup>? optionGroups,
  }) {
    return ProductItem(
      id: id ?? this.id,
      categoryId: categoryId ?? this.categoryId,
      categoryName: categoryName ?? this.categoryName,
      name: name ?? this.name,
      description: description ?? this.description,
      basePriceInr: basePriceInr ?? this.basePriceInr,
      salePriceInr: salePriceInr ?? this.salePriceInr,
      effectivePriceInr: effectivePriceInr ?? this.effectivePriceInr,
      sku: sku ?? this.sku,
      barcode: barcode ?? this.barcode,
      isVeg: isVeg ?? this.isVeg,
      isPerishable: isPerishable ?? this.isPerishable,
      preparationTimeMinutes: preparationTimeMinutes ?? this.preparationTimeMinutes,
      imageUrl: imageUrl ?? this.imageUrl,
      images: images ?? this.images,
      stockQuantity: stockQuantity ?? this.stockQuantity,
      isInStock: isInStock ?? this.isInStock,
      lowStockThreshold: lowStockThreshold ?? this.lowStockThreshold,
      productStatus: productStatus ?? this.productStatus,
      adminStatus: adminStatus ?? this.adminStatus,
      rejectionReason: rejectionReason ?? this.rejectionReason,
      displayOrder: displayOrder ?? this.displayOrder,
      dietaryFlags: dietaryFlags ?? this.dietaryFlags,
      outletIsAvailable: outletIsAvailable ?? this.outletIsAvailable,
      variants: variants ?? this.variants,
      optionGroups: optionGroups ?? this.optionGroups,
    );
  }

  factory ProductItem.fromJson(Map<String, dynamic> json) {
    final basePrice = (json['basePriceInr'] as num?)?.toDouble() ?? 0.0;
    final salePrice = (json['salePriceInr'] as num?)?.toDouble();
    final effectivePrice = (json['effectivePriceInr'] as num?)?.toDouble() ?? (salePrice ?? basePrice);

    return ProductItem(
      id: json['id'] as String? ?? '',
      categoryId: json['categoryId'] as String? ?? json['category_id'] as String? ?? '',
      categoryName: json['categoryName'] as String? ?? json['category_name'] as String? ?? 'General',
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      basePriceInr: basePrice,
      salePriceInr: salePrice,
      effectivePriceInr: effectivePrice,
      sku: json['sku'] as String?,
      barcode: json['barcode'] as String?,
      isVeg: json['isVeg'] as bool? ?? json['is_veg'] as bool? ?? true,
      isPerishable: json['isPerishable'] as bool? ?? json['is_perishable'] as bool? ?? false,
      preparationTimeMinutes: (json['preparationTimeMinutes'] as num?)?.toInt() ??
          (json['preparation_time_minutes'] as num?)?.toInt() ??
          15,
      imageUrl: json['imageUrl'] as String? ?? json['image_url'] as String?,
      images: (json['images'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      stockQuantity: (json['stockQuantity'] as num?)?.toInt() ?? 0,
      isInStock: json['isInStock'] as bool? ?? true,
      lowStockThreshold: (json['lowStockThreshold'] as num?)?.toInt() ?? 5,
      productStatus: json['productStatus'] as String? ?? json['product_status'] as String? ?? 'ACTIVE',
      adminStatus: json['adminStatus'] as String? ?? json['admin_status'] as String? ?? 'APPROVED',
      rejectionReason: json['rejectionReason'] as String? ?? json['rejection_reason'] as String?,
      displayOrder: (json['displayOrder'] as num?)?.toInt() ?? 0,
      dietaryFlags: (json['dietaryFlags'] as Map<String, dynamic>?) ?? {},
      outletIsAvailable: json['outletIsAvailable'] as bool? ?? true,
      variants: (json['variants'] as List<dynamic>?)
              ?.map((e) => ProductVariant.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      optionGroups: (json['optionGroups'] as List<dynamic>?)
              ?.map((e) => OptionGroup.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'categoryId': categoryId,
    'categoryName': categoryName,
    'name': name,
    'description': description,
    'basePriceInr': basePriceInr,
    'salePriceInr': salePriceInr,
    'effectivePriceInr': effectivePriceInr,
    'sku': sku,
    'barcode': barcode,
    'isVeg': isVeg,
    'isPerishable': isPerishable,
    'preparationTimeMinutes': preparationTimeMinutes,
    'imageUrl': imageUrl,
    'images': images,
    'stockQuantity': stockQuantity,
    'isInStock': isInStock,
    'lowStockThreshold': lowStockThreshold,
    'productStatus': productStatus,
    'adminStatus': adminStatus,
    'rejectionReason': rejectionReason,
    'displayOrder': displayOrder,
    'dietaryFlags': dietaryFlags,
    'outletIsAvailable': outletIsAvailable,
    'variants': variants.map((v) => v.toJson()).toList(),
    'optionGroups': optionGroups.map((g) => g.toJson()).toList(),
  };
}
