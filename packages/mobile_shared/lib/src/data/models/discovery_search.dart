import 'discovery_outlet.dart';

class DiscoverySearchResult {
  final String query;
  final String? verticalType;
  final List<DiscoveryItem> items;
  final List<DiscoveryOutlet> outlets;
  final List<DiscoveryCategory> categories;
  final int totalItems;
  final int totalOutlets;
  final int page;
  final int limit;

  DiscoverySearchResult({
    required this.query,
    this.verticalType,
    required this.items,
    required this.outlets,
    required this.categories,
    required this.totalItems,
    required this.totalOutlets,
    required this.page,
    required this.limit,
  });

  factory DiscoverySearchResult.fromJson(Map<String, dynamic> json) {
    final results = json['results'] as Map<String, dynamic>? ?? {};
    final rawItems = results['items'] as List<dynamic>? ?? [];
    final rawOutlets = results['outlets'] as List<dynamic>? ?? [];
    final rawCategories = results['categories'] as List<dynamic>? ?? [];

    return DiscoverySearchResult(
      query: json['query']?.toString() ?? '',
      verticalType: json['verticalType']?.toString(),
      items: rawItems.map((e) => DiscoveryItem.fromJson(e as Map<String, dynamic>)).toList(),
      outlets: rawOutlets.map((e) => DiscoveryOutlet.fromJson(e as Map<String, dynamic>)).toList(),
      categories: rawCategories.map((e) => DiscoveryCategory.fromJson(e as Map<String, dynamic>)).toList(),
      totalItems: json['totalItems'] as int? ?? rawItems.length,
      totalOutlets: json['totalOutlets'] as int? ?? rawOutlets.length,
      page: json['page'] as int? ?? 1,
      limit: json['limit'] as int? ?? 20,
    );
  }
}

class DiscoveryItem {
  final String id;
  final String name;
  final String? description;
  final double basePriceInr;
  final double effectivePriceInr;
  final bool isVeg;
  final String? barcode;
  final String? imageUrl;
  final String categoryId;
  final String? categoryName;
  final String? verticalType;
  final String outletId;
  final String outletName;
  final String? outletAddress;
  final double distanceKm;
  final bool outletAvailable;

  DiscoveryItem({
    required this.id,
    required this.name,
    this.description,
    required this.basePriceInr,
    required this.effectivePriceInr,
    required this.isVeg,
    this.barcode,
    this.imageUrl,
    required this.categoryId,
    this.categoryName,
    this.verticalType,
    required this.outletId,
    required this.outletName,
    this.outletAddress,
    this.distanceKm = 0.0,
    this.outletAvailable = true,
  });

  factory DiscoveryItem.fromJson(Map<String, dynamic> json) {
    return DiscoveryItem(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      description: json['description']?.toString(),
      basePriceInr: (json['base_price_inr'] as num?)?.toDouble() ?? 0.0,
      effectivePriceInr: (json['effective_price_inr'] as num?)?.toDouble() ??
          (json['base_price_inr'] as num?)?.toDouble() ??
          0.0,
      isVeg: json['is_veg'] as bool? ?? true,
      barcode: json['barcode']?.toString(),
      imageUrl: json['image_url']?.toString(),
      categoryId: json['category_id']?.toString() ?? '',
      categoryName: json['category_name']?.toString(),
      verticalType: json['vertical_type']?.toString(),
      outletId: json['outlet_id']?.toString() ?? '',
      outletName: json['outlet_name']?.toString() ?? '',
      outletAddress: json['outlet_address']?.toString(),
      distanceKm: (json['distance_km'] as num?)?.toDouble() ?? 0.0,
      outletAvailable: json['outlet_available'] as bool? ?? true,
    );
  }
}

class SearchSuggestion {
  final String id;
  final String text;
  final String type; // 'ITEM', 'OUTLET', 'CATEGORY'

  SearchSuggestion({
    required this.id,
    required this.text,
    required this.type,
  });

  factory SearchSuggestion.fromJson(Map<String, dynamic> json) {
    return SearchSuggestion(
      id: json['id']?.toString() ?? '',
      text: json['text']?.toString() ?? '',
      type: json['type']?.toString() ?? 'ITEM',
    );
  }
}
