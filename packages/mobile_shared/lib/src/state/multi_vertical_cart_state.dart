import 'package:flutter_riverpod/flutter_riverpod.dart';

export 'package:flutter_riverpod/flutter_riverpod.dart';

enum ServiceVertical {
  food,
  grocery,
  courier,
}

class CartItem {
  final String id;
  final String itemId;
  final String name;
  final double unitPriceInr;
  final int quantity;
  final String? variantId;
  final List<String> selectedOptionIds;

  const CartItem({
    required this.id,
    required this.itemId,
    required this.name,
    required this.unitPriceInr,
    required this.quantity,
    this.variantId,
    this.selectedOptionIds = const [],
  });

  double get totalPriceInr => unitPriceInr * quantity;

  CartItem copyWith({
    String? id,
    String? itemId,
    String? name,
    double? unitPriceInr,
    int? quantity,
    String? variantId,
    List<String>? selectedOptionIds,
  }) {
    return CartItem(
      id: id ?? this.id,
      itemId: itemId ?? this.itemId,
      name: name ?? this.name,
      unitPriceInr: unitPriceInr ?? this.unitPriceInr,
      quantity: quantity ?? this.quantity,
      variantId: variantId ?? this.variantId,
      selectedOptionIds: selectedOptionIds ?? this.selectedOptionIds,
    );
  }
}

class VerticalCartState {
  final ServiceVertical vertical;
  final String? outletId;
  final String? outletName;
  final List<CartItem> items;
  final double deliveryFeeInr;
  final double packagingFeeInr;
  final double platformFeeInr;
  final double surgeMultiplier;
  final double discountInr;
  final String? appliedCouponCode;

  const VerticalCartState({
    required this.vertical,
    this.outletId,
    this.outletName,
    this.items = const [],
    this.deliveryFeeInr = 35.0,
    this.packagingFeeInr = 15.0,
    this.platformFeeInr = 5.0,
    this.surgeMultiplier = 1.0,
    this.discountInr = 0.0,
    this.appliedCouponCode,
  });

  double get itemsSubtotalInr =>
      items.fold(0.0, (sum, item) => sum + item.totalPriceInr);

  double get gstAmountInr => itemsSubtotalInr * 0.05;

  double get effectiveDeliveryFeeInr => deliveryFeeInr * surgeMultiplier;

  double get finalPayableInr {
    final raw = itemsSubtotalInr +
        gstAmountInr +
        effectiveDeliveryFeeInr +
        packagingFeeInr +
        platformFeeInr -
        discountInr;
    return raw > 0 ? raw : 0.0;
  }

  bool get isEmpty => items.isEmpty;

  VerticalCartState copyWith({
    ServiceVertical? vertical,
    String? outletId,
    String? outletName,
    List<CartItem>? items,
    double? deliveryFeeInr,
    double? packagingFeeInr,
    double? platformFeeInr,
    double? surgeMultiplier,
    double? discountInr,
    String? appliedCouponCode,
  }) {
    return VerticalCartState(
      vertical: vertical ?? this.vertical,
      outletId: outletId ?? this.outletId,
      outletName: outletName ?? this.outletName,
      items: items ?? this.items,
      deliveryFeeInr: deliveryFeeInr ?? this.deliveryFeeInr,
      packagingFeeInr: packagingFeeInr ?? this.packagingFeeInr,
      platformFeeInr: platformFeeInr ?? this.platformFeeInr,
      surgeMultiplier: surgeMultiplier ?? this.surgeMultiplier,
      discountInr: discountInr ?? this.discountInr,
      appliedCouponCode: appliedCouponCode ?? this.appliedCouponCode,
    );
  }
}

class VerticalCartNotifier extends StateNotifier<VerticalCartState> {
  VerticalCartNotifier(ServiceVertical vertical)
      : super(VerticalCartState(vertical: vertical));

  void setOutlet(String outletId, String outletName) {
    if (state.outletId != outletId) {
      state = VerticalCartState(
        vertical: state.vertical,
        outletId: outletId,
        outletName: outletName,
        items: const [],
      );
    }
  }

  void addItem(CartItem item, {String? outletId, String? outletName}) {
    if (outletId != null && state.outletId != null && state.outletId != outletId) {
      // Prevent cross-outlet item contamination
      state = VerticalCartState(
        vertical: state.vertical,
        outletId: outletId,
        outletName: outletName,
        items: [item],
      );
      return;
    }

    final existingIndex = state.items.indexWhere((i) => i.itemId == item.itemId && i.variantId == item.variantId);
    if (existingIndex >= 0) {
      final updatedList = List<CartItem>.from(state.items);
      final existing = updatedList[existingIndex];
      updatedList[existingIndex] = existing.copyWith(quantity: existing.quantity + item.quantity);
      state = state.copyWith(items: updatedList);
    } else {
      state = state.copyWith(
        outletId: outletId ?? state.outletId,
        outletName: outletName ?? state.outletName,
        items: [...state.items, item],
      );
    }
  }

  void updateQuantity(String cartItemId, int quantity) {
    if (quantity <= 0) {
      removeItem(cartItemId);
      return;
    }
    final updatedList = state.items.map((i) {
      if (i.id == cartItemId) {
        return i.copyWith(quantity: quantity);
      }
      return i;
    }).toList();
    state = state.copyWith(items: updatedList);
  }

  void removeItem(String cartItemId) {
    final updatedList = state.items.where((i) => i.id != cartItemId).toList();
    if (updatedList.isEmpty) {
      state = VerticalCartState(vertical: state.vertical);
    } else {
      state = state.copyWith(items: updatedList);
    }
  }

  void applyCoupon(String code, double discountInr) {
    state = state.copyWith(appliedCouponCode: code, discountInr: discountInr);
  }

  void clearCart() {
    state = VerticalCartState(vertical: state.vertical);
  }
}

// Independent, isolated StateNotifierProviders for each vertical
final foodCartProvider =
    StateNotifierProvider<VerticalCartNotifier, VerticalCartState>((ref) {
  return VerticalCartNotifier(ServiceVertical.food);
});

final groceryCartProvider =
    StateNotifierProvider<VerticalCartNotifier, VerticalCartState>((ref) {
  return VerticalCartNotifier(ServiceVertical.grocery);
});

final courierCartProvider =
    StateNotifierProvider<VerticalCartNotifier, VerticalCartState>((ref) {
  return VerticalCartNotifier(ServiceVertical.courier);
});
