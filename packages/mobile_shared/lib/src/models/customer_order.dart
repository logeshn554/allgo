class CartItemOption {
  final String groupId;
  final String groupName;
  final String optionId;
  final String optionName;
  final double priceInr;

  String get name => optionName;

  const CartItemOption({
    required this.groupId,
    required this.groupName,
    required this.optionId,
    required this.optionName,
    required this.priceInr,
  });

  factory CartItemOption.fromJson(Map<String, dynamic> json) {
    return CartItemOption(
      groupId: json['groupId'] as String? ?? json['group_id'] as String? ?? '',
      groupName: json['groupName'] as String? ?? json['group_name'] as String? ?? '',
      optionId: json['optionId'] as String? ?? json['option_id'] as String? ?? '',
      optionName: json['optionName'] as String? ?? json['option_name'] as String? ?? '',
      priceInr: (json['priceInr'] as num?)?.toDouble() ?? (json['price_inr'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
    'groupId': groupId,
    'groupName': groupName,
    'optionId': optionId,
    'optionName': optionName,
    'priceInr': priceInr,
  };
}

class CartItemModel {
  final String id;
  final String itemId;
  final String name;
  final String? imageUrl;
  final bool isVeg;
  final String? variantId;
  final String? variantName;
  final int quantity;
  final int stockQuantity;
  final bool isInStock;
  final double unitPriceInr;
  final double totalPriceInr;
  final String? outletId;
  final String? outletName;
  final String? verticalType;
  final List<CartItemOption> selectedOptions;
  final String? specialInstructions;

  List<CartItemOption> get options => selectedOptions;

  const CartItemModel({
    required this.id,
    required this.itemId,
    required this.name,
    this.outletId,
    this.outletName,
    this.verticalType,
    this.imageUrl,
    required this.isVeg,
    this.variantId,
    this.variantName,
    required this.quantity,
    required this.stockQuantity,
    required this.isInStock,
    required this.unitPriceInr,
    required this.totalPriceInr,
    required this.selectedOptions,
    this.specialInstructions,
  });

  factory CartItemModel.fromJson(Map<String, dynamic> json) {
    final rawOpts = json['selectedOptions'] as List<dynamic>? ?? [];
    return CartItemModel(
      id: json['id'] as String? ?? '',
      itemId: json['itemId'] as String? ?? json['item_id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      outletId: json['outletId'] as String? ?? json['outlet_id'] as String?,
      outletName: json['outletName'] as String? ?? json['outlet_name'] as String?,
      verticalType: json['verticalType'] as String? ?? json['vertical_type'] as String?,
      imageUrl: json['imageUrl'] as String? ?? json['image_url'] as String?,
      isVeg: json['isVeg'] as bool? ?? json['is_veg'] as bool? ?? false,
      variantId: json['variantId'] as String? ?? json['variant_id'] as String?,
      variantName: json['variantName'] as String? ?? json['variant_name'] as String?,
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      stockQuantity: (json['stockQuantity'] as num?)?.toInt() ?? (json['stock_quantity'] as num?)?.toInt() ?? 999,
      isInStock: json['isInStock'] as bool? ?? json['is_in_stock'] as bool? ?? true,
      unitPriceInr: (json['unitPriceInr'] as num?)?.toDouble() ?? (json['unit_price_inr'] as num?)?.toDouble() ?? 0.0,
      totalPriceInr: (json['totalPriceInr'] as num?)?.toDouble() ?? (json['total_price_inr'] as num?)?.toDouble() ?? 0.0,
      selectedOptions: rawOpts.map((o) => CartItemOption.fromJson(o as Map<String, dynamic>)).toList(),
      specialInstructions: json['specialInstructions'] as String? ?? json['special_instructions'] as String?,
    );
  }
}

class CartPricingModel {
  final double itemsSubtotalInr;
  final double deliveryFeeInr;
  final double packagingFeeInr;
  final double platformFeeInr;
  final double gstAmountInr;
  final double discountAmountInr;
  final double finalPayableAmountInr;
  final double distanceKm;
  final String? appliedCouponCode;

  double get subtotalInr => itemsSubtotalInr;
  double get taxInr => gstAmountInr;
  double get discountInr => discountAmountInr;
  double get finalTotalInr => finalPayableAmountInr;

  const CartPricingModel({
    required this.itemsSubtotalInr,
    required this.deliveryFeeInr,
    required this.packagingFeeInr,
    required this.platformFeeInr,
    required this.gstAmountInr,
    required this.discountAmountInr,
    required this.finalPayableAmountInr,
    required this.distanceKm,
    this.appliedCouponCode,
  });

  factory CartPricingModel.fromJson(Map<String, dynamic> json) {
    final coupon = json['appliedCoupon'] as Map<String, dynamic>?;
    return CartPricingModel(
      itemsSubtotalInr: (json['itemsSubtotalInr'] as num?)?.toDouble() ?? 0.0,
      deliveryFeeInr: (json['deliveryFeeInr'] as num?)?.toDouble() ?? 0.0,
      packagingFeeInr: (json['packagingFeeInr'] as num?)?.toDouble() ?? 0.0,
      platformFeeInr: (json['platformFeeInr'] as num?)?.toDouble() ?? 0.0,
      gstAmountInr: (json['gstAmountInr'] as num?)?.toDouble() ?? 0.0,
      discountAmountInr: (json['discountAmountInr'] as num?)?.toDouble() ?? 0.0,
      finalPayableAmountInr: (json['finalPayableAmountInr'] as num?)?.toDouble() ?? 0.0,
      distanceKm: (json['distanceKm'] as num?)?.toDouble() ?? 2.5,
      appliedCouponCode: coupon?['code'] as String?,
    );
  }
}

class CartOutletSummary {
  final String id;
  final String name;
  final String status;
  final String? address;

  const CartOutletSummary({
    required this.id,
    required this.name,
    required this.status,
    this.address,
  });

  factory CartOutletSummary.fromJson(Map<String, dynamic> json) {
    return CartOutletSummary(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      status: json['status'] as String? ?? 'ACTIVE',
      address: json['address'] as String?,
    );
  }
}

class CartOutletGroup {
  final String id;
  final String name;
  final String status;
  final String? address;
  final String verticalType;
  final double packagingFeeInr;
  final double deliveryFeeInr;
  final double subtotalInr;
  final int totalItemsCount;
  final List<CartItemModel> items;

  const CartOutletGroup({
    required this.id,
    required this.name,
    required this.status,
    this.address,
    this.verticalType = 'FOOD',
    this.packagingFeeInr = 15.0,
    this.deliveryFeeInr = 0.0,
    this.subtotalInr = 0.0,
    this.totalItemsCount = 0,
    this.items = const [],
  });

  factory CartOutletGroup.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List<dynamic>? ?? [];
    return CartOutletGroup(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      status: json['status'] as String? ?? 'ACTIVE',
      address: json['address'] as String?,
      verticalType: json['verticalType'] as String? ?? 'FOOD',
      packagingFeeInr: (json['packagingFeeInr'] as num?)?.toDouble() ?? 15.0,
      deliveryFeeInr: (json['deliveryFeeInr'] as num?)?.toDouble() ?? 0.0,
      subtotalInr: (json['subtotalInr'] as num?)?.toDouble() ?? 0.0,
      totalItemsCount: (json['totalItemsCount'] as num?)?.toInt() ?? 0,
      items: rawItems.map((i) => CartItemModel.fromJson(i as Map<String, dynamic>)).toList(),
    );
  }
}

class CartModel {
  final String cartId;
  final CartOutletSummary? outlet;
  final List<CartOutletGroup> outlets;
  final List<CartItemModel> items;
  final int totalItemsCount;
  final CartPricingModel? pricing;

  String? get outletName => outlet?.name;
  bool get hasMultipleOutlets => outlets.length > 1;

  factory CartModel.empty() => const CartModel(cartId: '', items: [], outlets: [], totalItemsCount: 0);

  const CartModel({
    required this.cartId,
    this.outlet,
    this.outlets = const [],
    required this.items,
    required this.totalItemsCount,
    this.pricing,
  });

  factory CartModel.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List<dynamic>? ?? [];
    final itemsList = rawItems.map((i) => CartItemModel.fromJson(i as Map<String, dynamic>)).toList();
    final rawOutlets = json['outlets'] as List<dynamic>?;
    List<CartOutletGroup> outletsList = [];

    if (rawOutlets != null && rawOutlets.isNotEmpty) {
      outletsList = rawOutlets.map((o) => CartOutletGroup.fromJson(o as Map<String, dynamic>)).toList();
    } else if (json['outlet'] != null) {
      final oMap = json['outlet'] as Map<String, dynamic>;
      outletsList = [
        CartOutletGroup(
          id: oMap['id'] as String? ?? '',
          name: oMap['name'] as String? ?? '',
          status: oMap['status'] as String? ?? 'ACTIVE',
          address: oMap['address'] as String?,
          items: itemsList,
          totalItemsCount: itemsList.fold(0, (sum, it) => sum + it.quantity),
          subtotalInr: itemsList.fold(0.0, (sum, it) => sum + it.totalPriceInr),
        ),
      ];
    }

    return CartModel(
      cartId: json['cartId'] as String? ?? '',
      outlet: json['outlet'] != null ? CartOutletSummary.fromJson(json['outlet'] as Map<String, dynamic>) : null,
      outlets: outletsList,
      items: itemsList,
      totalItemsCount: (json['totalItemsCount'] as num?)?.toInt() ?? 0,
      pricing: json['pricing'] != null ? CartPricingModel.fromJson(json['pricing'] as Map<String, dynamic>) : null,
    );
  }
}


class CustomerOrderDetail {
  final String id;
  final String subOrderNumber;
  final String status;
  final String verticalType;
  final int prepTimeMinutes;
  final String? deliveryPin;
  final String? cancellationReason;
  final Map<String, dynamic> outlet;
  final Map<String, dynamic>? deliveryAddressSnapshot;
  final List<dynamic> items;
  final Map<String, dynamic> pricing;
  final Map<String, dynamic>? deliveryJob;
  final String createdAt;
  final String? estimatedReadyAt;

  double get totalInr => (pricing['finalPayableAmountInr'] as num?)?.toDouble() ?? (pricing['final_payable_amount_inr'] as num?)?.toDouble() ?? 0.0;
  double get itemsTotalInr => (pricing['itemsSubtotalInr'] as num?)?.toDouble() ?? (pricing['items_subtotal_inr'] as num?)?.toDouble() ?? 0.0;
  double get deliveryFeeInr => (pricing['deliveryFeeInr'] as num?)?.toDouble() ?? (pricing['delivery_fee_inr'] as num?)?.toDouble() ?? 0.0;
  double get packagingFeeInr => (pricing['packagingFeeInr'] as num?)?.toDouble() ?? (pricing['packaging_fee_inr'] as num?)?.toDouble() ?? 0.0;
  double get taxInr => (pricing['gstAmountInr'] as num?)?.toDouble() ?? (pricing['tax_inr'] as num?)?.toDouble() ?? 0.0;

  const CustomerOrderDetail({
    required this.id,
    required this.subOrderNumber,
    required this.status,
    required this.verticalType,
    required this.prepTimeMinutes,
    this.deliveryPin,
    this.cancellationReason,
    required this.outlet,
    this.deliveryAddressSnapshot,
    required this.items,
    required this.pricing,
    this.deliveryJob,
    required this.createdAt,
    this.estimatedReadyAt,
  });

  factory CustomerOrderDetail.fromJson(Map<String, dynamic> json) {
    return CustomerOrderDetail(
      id: json['id'] as String? ?? '',
      subOrderNumber: json['subOrderNumber'] as String? ?? '',
      status: json['status'] as String? ?? 'PLACED',
      verticalType: json['verticalType'] as String? ?? 'FOOD',
      prepTimeMinutes: (json['prepTimeMinutes'] as num?)?.toInt() ?? 15,
      deliveryPin: json['deliveryPin'] as String?,
      cancellationReason: json['cancellationReason'] as String?,
      outlet: json['outlet'] as Map<String, dynamic>? ?? {},
      deliveryAddressSnapshot: json['deliveryAddressSnapshot'] as Map<String, dynamic>?,
      items: json['items'] as List<dynamic>? ?? [],
      pricing: json['pricing'] as Map<String, dynamic>? ?? {},
      deliveryJob: json['deliveryJob'] as Map<String, dynamic>?,
      createdAt: json['createdAt'] as String? ?? '',
      estimatedReadyAt: json['estimatedReadyAt'] as String?,
    );
  }
}
