class CartItemOption {
  final String groupId;
  final String groupName;
  final String optionId;
  final String optionName;
  final double priceInr;

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
  final List<CartItemOption> selectedOptions;
  final String? specialInstructions;

  const CartItemModel({
    required this.id,
    required this.itemId,
    required this.name,
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

class CartModel {
  final String cartId;
  final CartOutletSummary? outlet;
  final List<CartItemModel> items;
  final int totalItemsCount;
  final CartPricingModel? pricing;

  const CartModel({
    required this.cartId,
    this.outlet,
    required this.items,
    required this.totalItemsCount,
    this.pricing,
  });

  factory CartModel.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List<dynamic>? ?? [];
    return CartModel(
      cartId: json['cartId'] as String? ?? '',
      outlet: json['outlet'] != null ? CartOutletSummary.fromJson(json['outlet'] as Map<String, dynamic>) : null,
      items: rawItems.map((i) => CartItemModel.fromJson(i as Map<String, dynamic>)).toList(),
      totalItemsCount: (json['totalItemsCount'] as num?)?.toInt() ?? 0,
      pricing: json['pricing'] != null ? CartPricingModel.fromJson(json['pricing'] as Map<String, dynamic>) : null,
    );
  }
}

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
    required this.state,
    required this.postalCode,
    required this.latitude,
    required this.longitude,
    required this.isDefault,
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
