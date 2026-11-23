import 'package:flutter_riverpod/flutter_riverpod.dart';

export 'package:flutter_riverpod/flutter_riverpod.dart';

enum ServiceVertical {
  food,
  grocery,
  courier,
  homemade,
}

class CartItem {
  final String id;
  final String itemId;
  final String name;
  final double unitPriceInr;
  final int quantity;
  final String? variantId;
  final String? outletId;
  final String? outletName;
  final ServiceVertical vertical;
  final List<String> selectedOptionIds;

  const CartItem({
    required this.id,
    required this.itemId,
    required this.name,
    required this.unitPriceInr,
    required this.quantity,
    this.variantId,
    this.outletId,
    this.outletName,
    this.vertical = ServiceVertical.food,
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
    String? outletId,
    String? outletName,
    ServiceVertical? vertical,
    List<String>? selectedOptionIds,
  }) {
    return CartItem(
      id: id ?? this.id,
      itemId: itemId ?? this.itemId,
      name: name ?? this.name,
      unitPriceInr: unitPriceInr ?? this.unitPriceInr,
      quantity: quantity ?? this.quantity,
      variantId: variantId ?? this.variantId,
      outletId: outletId ?? this.outletId,
      outletName: outletName ?? this.outletName,
      vertical: vertical ?? this.vertical,
      selectedOptionIds: selectedOptionIds ?? this.selectedOptionIds,
    );
  }
}

class OutletCartGroup {
  final String outletId;
  final String outletName;
  final ServiceVertical vertical;
  final List<CartItem> items;
  final double deliveryFeeInr;
  final double packagingFeeInr;

  const OutletCartGroup({
    required this.outletId,
    required this.outletName,
    this.vertical = ServiceVertical.food,
    this.items = const [],
    this.deliveryFeeInr = 35.0,
    this.packagingFeeInr = 15.0,
  });

  double get itemsSubtotalInr =>
      items.fold(0.0, (sum, item) => sum + item.totalPriceInr);

  double get gstAmountInr => itemsSubtotalInr * 0.05;

  double get outletTotalInr =>
      itemsSubtotalInr + gstAmountInr + deliveryFeeInr + packagingFeeInr;

  int get totalQuantity =>
      items.fold(0, (sum, item) => sum + item.quantity);

  OutletCartGroup copyWith({
    String? outletId,
    String? outletName,
    ServiceVertical? vertical,
    List<CartItem>? items,
    double? deliveryFeeInr,
    double? packagingFeeInr,
  }) {
    return OutletCartGroup(
      outletId: outletId ?? this.outletId,
      outletName: outletName ?? this.outletName,
      vertical: vertical ?? this.vertical,
      items: items ?? this.items,
      deliveryFeeInr: deliveryFeeInr ?? this.deliveryFeeInr,
      packagingFeeInr: packagingFeeInr ?? this.packagingFeeInr,
    );
  }
}

class MultiVerticalCartState {
  final Map<String, OutletCartGroup> outletGroups;
  final double platformFeeInr;
  final double surgeMultiplier;
  final double discountInr;
  final String? appliedCouponCode;

  const MultiVerticalCartState({
    this.outletGroups = const {},
    this.platformFeeInr = 5.0,
    this.surgeMultiplier = 1.0,
    this.discountInr = 0.0,
    this.appliedCouponCode,
  });

  List<OutletCartGroup> get outlets => outletGroups.values.toList();

  List<CartItem> get items =>
      outletGroups.values.expand((g) => g.items).toList();

  int get totalItemsCount =>
      items.fold(0, (sum, item) => sum + item.quantity);

  double get itemsSubtotalInr =>
      outletGroups.values.fold(0.0, (sum, g) => sum + g.itemsSubtotalInr);

  double get totalDeliveryFeeInr =>
      outletGroups.values.fold(0.0, (sum, g) => sum + (g.deliveryFeeInr * surgeMultiplier));

  double get totalPackagingFeeInr =>
      outletGroups.values.fold(0.0, (sum, g) => sum + g.packagingFeeInr);

  double get totalGstAmountInr => itemsSubtotalInr * 0.05;

  double get finalPayableInr {
    final raw = itemsSubtotalInr +
        totalGstAmountInr +
        totalDeliveryFeeInr +
        totalPackagingFeeInr +
        platformFeeInr -
        discountInr;
    return raw > 0 ? raw : 0.0;
  }

  bool get isEmpty => items.isEmpty;
  bool get hasMultipleOutlets => outletGroups.length > 1;

  MultiVerticalCartState copyWith({
    Map<String, OutletCartGroup>? outletGroups,
    double? platformFeeInr,
    double? surgeMultiplier,
    double? discountInr,
    String? appliedCouponCode,
  }) {
    return MultiVerticalCartState(
      outletGroups: outletGroups ?? this.outletGroups,
      platformFeeInr: platformFeeInr ?? this.platformFeeInr,
      surgeMultiplier: surgeMultiplier ?? this.surgeMultiplier,
      discountInr: discountInr ?? this.discountInr,
      appliedCouponCode: appliedCouponCode ?? this.appliedCouponCode,
    );
  }
}

class MultiVerticalCartNotifier extends StateNotifier<MultiVerticalCartState> {
  MultiVerticalCartNotifier() : super(const MultiVerticalCartState());

  void addItem(
    CartItem item, {
    required String outletId,
    required String outletName,
    ServiceVertical vertical = ServiceVertical.food,
    double deliveryFeeInr = 35.0,
    double packagingFeeInr = 15.0,
  }) {
    final groups = Map<String, OutletCartGroup>.from(state.outletGroups);
    final group = groups[outletId] ??
        OutletCartGroup(
          outletId: outletId,
          outletName: outletName,
          vertical: vertical,
          deliveryFeeInr: deliveryFeeInr,
          packagingFeeInr: packagingFeeInr,
        );

    final existingIndex = group.items.indexWhere(
      (i) => i.itemId == item.itemId && i.variantId == item.variantId,
    );

    List<CartItem> updatedItems;
    if (existingIndex >= 0) {
      updatedItems = List<CartItem>.from(group.items);
      final existing = updatedItems[existingIndex];
      updatedItems[existingIndex] =
          existing.copyWith(quantity: existing.quantity + item.quantity);
    } else {
      updatedItems = [
        ...group.items,
        item.copyWith(
          outletId: outletId,
          outletName: outletName,
          vertical: vertical,
        ),
      ];
    }

    groups[outletId] = group.copyWith(items: updatedItems);
    state = state.copyWith(outletGroups: groups);
  }

  void updateQuantity(String cartItemId, int quantity) {
    if (quantity <= 0) {
      removeItem(cartItemId);
      return;
    }

    final groups = Map<String, OutletCartGroup>.from(state.outletGroups);
    for (final entry in groups.entries) {
      final index = entry.value.items.indexWhere((i) => i.id == cartItemId);
      if (index >= 0) {
        final updatedItems = List<CartItem>.from(entry.value.items);
        updatedItems[index] = updatedItems[index].copyWith(quantity: quantity);
        groups[entry.key] = entry.value.copyWith(items: updatedItems);
        state = state.copyWith(outletGroups: groups);
        return;
      }
    }
  }

  void removeItem(String cartItemId) {
    final groups = Map<String, OutletCartGroup>.from(state.outletGroups);
    String? outletToRemove;

    for (final entry in groups.entries) {
      final updatedItems = entry.value.items.where((i) => i.id != cartItemId).toList();
      if (updatedItems.length != entry.value.items.length) {
        if (updatedItems.isEmpty) {
          outletToRemove = entry.key;
        } else {
          groups[entry.key] = entry.value.copyWith(items: updatedItems);
        }
        break;
      }
    }

    if (outletToRemove != null) {
      groups.remove(outletToRemove);
    }

    state = state.copyWith(outletGroups: groups);
  }

  void clearOutlet(String outletId) {
    final groups = Map<String, OutletCartGroup>.from(state.outletGroups);
    groups.remove(outletId);
    state = state.copyWith(outletGroups: groups);
  }

  void clearCart() {
    state = const MultiVerticalCartState();
  }

  void applyCoupon(String code, double discountInr) {
    state = state.copyWith(appliedCouponCode: code, discountInr: discountInr);
  }
}

// Global Multi-Merchant Unified Cart Provider
final unifiedCartProvider =
    StateNotifierProvider<MultiVerticalCartNotifier, MultiVerticalCartState>((ref) {
  return MultiVerticalCartNotifier();
});

// Backward-compatible VerticalCartState for screens expecting single-vertical cart
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
    final existingIndex = state.items.indexWhere(
      (i) => i.itemId == item.itemId && i.variantId == item.variantId,
    );
    if (existingIndex >= 0) {
      final updatedList = List<CartItem>.from(state.items);
      final existing = updatedList[existingIndex];
      updatedList[existingIndex] =
          existing.copyWith(quantity: existing.quantity + item.quantity);
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

// Preserved individual vertical providers (now allowing multi-item accumulation)
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
