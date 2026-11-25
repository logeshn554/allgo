import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import '../common/friendly_error.dart';
import '../components/cart_bill_details.dart';
import '../components/cart_coupon_section.dart';
import '../components/cart_item_card.dart';
import '../components/delivery_instructions_selector.dart';
import '../components/delivery_slot_picker.dart';
import '../components/delivery_tip_selector.dart';
import '../widgets/empty_state_view.dart';
import '../components/guest_login_prompt_sheet.dart';
import 'checkout_screen.dart';

class CartScreen extends ConsumerStatefulWidget {
  const CartScreen({super.key});

  @override
  ConsumerState<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends ConsumerState<CartScreen> {
  bool _isLoading = true;
  CartModel? _cart;
  CartPricingModel? _pricing;

  String? _appliedCoupon;
  double _couponDiscount = 0.0;
  double _deliveryTip = 0.0;
  Set<String> _instructions = {};
  bool _noCutlery = false;
  final TextEditingController _cookingNotesCtrl = TextEditingController();
  bool _isScheduled = false;
  String _selectedSlot = 'NOW';
  static const double _freeDeliveryThresholdInr = 199.0;

  @override
  void initState() {
    super.initState();
    _loadCartData();
  }

  @override
  void dispose() {
    _cookingNotesCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadCartData() async {
    setState(() => _isLoading = true);
    final client = ref.read(apiClientProvider);
    try {
      final cart = await client.getCart();
      CartPricingModel? pricing;
      if (cart.items.isNotEmpty) {
        pricing = await client.getCheckoutEstimate().catchError((_) => null as dynamic);
      }
      if (mounted) {
        setState(() {
          _cart = cart;
          _pricing = pricing;
          _isLoading = false;
        });
      }
    } catch (e, st) {
      final err = FriendlyError.from(e, st);
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(err.message),
            action: SnackBarAction(label: 'Retry', onPressed: _loadCartData),
          ),
        );
      }
    }
  }

  Future<void> _updateQuantity(String cartItemId, int qty) async {
    try {
      final updated = await ref.read(apiClientProvider).updateCartItemQuantity(cartItemId, qty);
      final pricing = await ref.read(apiClientProvider).getCheckoutEstimate().catchError((_) => null as dynamic);
      if (mounted) setState(() { _cart = updated; _pricing = pricing; });
    } catch (e, st) {
      final err = FriendlyError.from(e, st);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err.message)));
    }
  }

  Future<void> _removeItem(String cartItemId) async {
    try {
      final updated = await ref.read(apiClientProvider).removeCartItem(cartItemId);
      CartPricingModel? pricing;
      if (updated.items.isNotEmpty) {
        pricing = await ref.read(apiClientProvider).getCheckoutEstimate().catchError((_) => null as dynamic);
      }
      if (mounted) setState(() { _cart = updated; _pricing = pricing; });
    } catch (e, st) {
      final err = FriendlyError.from(e, st);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err.message)));
    }
  }

  double get _finalTotal {
    final base = _pricing?.finalTotalInr ?? 0.0;
    return (base - _couponDiscount + _deliveryTip).clamp(0.0, 999999.0);
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('My Cart')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_cart == null || _cart!.items.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('My Cart')),
        body: EmptyStateView(
          icon: Icons.remove_shopping_cart_outlined,
          title: 'Your cart is empty',
          message: 'Explore nearby restaurants and grocery outlets to add items.',
          actionLabel: 'Browse Stores',
          onAction: () => Navigator.pop(context),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text('My Cart'),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_outline),
            tooltip: 'Clear Cart',
            onPressed: () async {
              await ref.read(apiClientProvider).clearCart();
              _loadCartData();
            },
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Free-delivery threshold progress bar
          Builder(
            builder: (ctx) {
              final itemsSubtotal = _pricing?.itemsSubtotalInr ?? 0.0;
              final remaining = (_freeDeliveryThresholdInr - itemsSubtotal).clamp(0.0, _freeDeliveryThresholdInr);
              final progress = (itemsSubtotal / _freeDeliveryThresholdInr).clamp(0.0, 1.0);
              return Container(
                margin: const EdgeInsets.only(bottom: 14),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: remaining <= 0 ? Colors.green.shade50 : AllGoColors.primary.withValues(alpha: 0.07),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: remaining <= 0 ? Colors.green.shade300 : AllGoColors.primary.withValues(alpha: 0.25),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      remaining <= 0
                          ? 'Unlocked FREE Delivery on this order!'
                          : 'Add ₹${remaining.toStringAsFixed(0)} more to unlock FREE delivery',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                    const SizedBox(height: 6),
                    LinearProgressIndicator(
                      value: progress,
                      minHeight: 6,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ],
                ),
              );
            },
          ),
          // Items section
          Text('Items from ${_cart!.outletName ?? "Store"}', style: AllGoTypography.heading3.copyWith(fontSize: 15)),
          const SizedBox(height: 12),
          ..._cart!.items.map((item) {
            return CartItemCard(
              item: item,
              onQuantityChanged: (qty) => _updateQuantity(item.id, qty),
              onRemove: () => _removeItem(item.id),
            );
          }),
          const SizedBox(height: 16),

          // Scheduled delivery slot
          DeliverySlotPicker(
            isScheduled: _isScheduled,
            selectedSlot: _selectedSlot,
            onSlotChanged: (sched, slot) => setState(() { _isScheduled = sched; _selectedSlot = slot; }),
          ),
          const SizedBox(height: 14),

          // Coupons section
          CartCouponSection(
            orderTotal: _pricing?.finalTotalInr ?? 100.0,
            appliedCoupon: _appliedCoupon,
            discountAmount: _couponDiscount,
            onCouponApplied: (code, disc) => setState(() { _appliedCoupon = code; _couponDiscount = disc; }),
            onCouponRemoved: () => setState(() { _appliedCoupon = null; _couponDiscount = 0.0; }),
          ),
          const SizedBox(height: 14),

          // Delivery Tip
          DeliveryTipSelector(
            selectedTip: _deliveryTip,
            onTipSelected: (tip) => setState(() => _deliveryTip = tip),
          ),
          const SizedBox(height: 14),

          // No-Cutlery Eco Toggle
          SwitchListTile(
            value: _noCutlery,
            contentPadding: EdgeInsets.zero,
            title: const Text('Don\'t send cutlery & napkins', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            subtitle: const Text('Help reduce single-use plastic', style: TextStyle(fontSize: 11)),
            onChanged: (v) => setState(() => _noCutlery = v),
          ),
          const SizedBox(height: 6),

          // Instructions & Notes
          DeliveryInstructionsSelector(
            selectedInstructions: _instructions,
            onChanged: (inst) => setState(() => _instructions = inst),
            cookingNotesController: _cookingNotesCtrl,
          ),
          const SizedBox(height: 16),

          // Bill Details
          if (_pricing != null) ...[
            CartBillDetails(pricing: _pricing!),
            const SizedBox(height: 24),
            AllGoButton(
              label: 'Proceed to Checkout - ₹${_finalTotal.toStringAsFixed(0)}',
              onPressed: () {
                final user = ref.read(currentUserProvider);
                if (user == null) {
                  GuestLoginPromptSheet.show(
                    context,
                    title: 'Sign In to Checkout',
                    subtitle: 'Please log in with your phone number to complete payment and place your order.',
                  );
                  return;
                }
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => CheckoutScreen(
                      couponCode: _appliedCoupon,
                      discountAmount: _couponDiscount,
                      deliveryTip: _deliveryTip,
                      instructions: [
                        ..._instructions,
                        if (_noCutlery) 'NO_CUTLERY',
                      ],
                      cookingNotes: _cookingNotesCtrl.text.trim(),
                      deliverySlot: _selectedSlot,
                    ),
                  ),
                );
              },
            ),
          ],
        ],
      ),
    );
  }
}
