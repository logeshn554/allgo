import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

import '../components/customer_product_card.dart';
import '../components/product_customizer_modal.dart';
import 'cart_screen.dart';

class OutletCatalogScreen extends ConsumerStatefulWidget {
  final String outletId;
  final String outletName;
  final String? categoryName;

  const OutletCatalogScreen({
    super.key,
    required this.outletId,
    required this.outletName,
    this.categoryName,
  });

  @override
  ConsumerState<OutletCatalogScreen> createState() => _OutletCatalogScreenState();
}

class _OutletCatalogScreenState extends ConsumerState<OutletCatalogScreen> {
  bool _isLoading = true;
  String? _errorMessage;

  OutletOpenStatusModel? _outletStatus;
  List<ProductItem> _products = [];
  List<dynamic> _categories = [];
  String? _selectedCategory;
  final TextEditingController _searchCtrl = TextEditingController();

  CartModel? _cart;

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    setState(() => _isLoading = true);
    final client = ref.read(apiClientProvider);
    try {
      final results = await Future.wait([
        client.getCustomerOutletStatus(widget.outletId),
        client.getCustomerOutletProducts(widget.outletId),
        client.getCustomerOutletCategories(widget.outletId),
        client.getCart().catchError((_) => CartModel.empty()),
      ]);

      if (mounted) {
        setState(() {
          _outletStatus = results[0] as OutletOpenStatusModel;
          final prodData = results[1] as Map<String, dynamic>;
          final items = (prodData['items'] as List<dynamic>?) ?? [];
          _products = items.map((p) => ProductItem.fromJson(p as Map<String, dynamic>)).toList();
          _categories = (results[2] as List<dynamic>?) ?? [];
          _cart = results[3] as CartModel;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _errorMessage = e.toString());
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _addToCart(ProductItem product, {List<String>? optionIds}) async {
    try {
      final updatedCart = await ref.read(apiClientProvider).addToCart(
        outletId: widget.outletId,
        productId: product.id,
        quantity: 1,
        selectedOptionIds: optionIds,
      );
      if (mounted) {
        setState(() => _cart = updatedCart);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${product.name} added to cart'),
            duration: const Duration(seconds: 2),
            action: SnackBarAction(
              label: 'VIEW CART',
              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CartScreen())),
            ),
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to add: $e')));
    }
  }

  void _showCustomizer(ProductItem product) async {
    try {
      final groups = await ref.read(apiClientProvider).getProductOptionGroups(product.id);
      if (groups.isEmpty) {
        _addToCart(product);
        return;
      }
      if (!mounted) return;
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        builder: (_) => ProductCustomizerModal(
          product: product,
          optionGroups: groups,
          onAddToCart: (qty, opts) => _addToCart(product, optionIds: opts),
        ),
      );
    } catch (_) {
      _addToCart(product);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AllGoColors.background,
      appBar: AppBar(
        title: Text(widget.outletName),
        actions: [
          IconButton(
            icon: const Icon(Icons.shopping_bag_outlined),
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CartScreen())),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? Center(child: Text('Error: $_errorMessage'))
              : Column(
                  children: [
                    if (_outletStatus != null && !_outletStatus!.isOpen)
                      Container(
                        padding: const EdgeInsets.all(10),
                        color: Colors.red.shade100,
                        child: const Row(
                          children: [
                            Icon(Icons.warning, color: Colors.red),
                            SizedBox(width: 8),
                            Text('Outlet is currently closed. Orders scheduled for later.', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    Expanded(
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _products.length,
                        itemBuilder: (context, index) {
                          final product = _products[index];
                          return CustomerProductCard(
                            product: product,
                            onAdd: () => _showCustomizer(product),
                          );
                        },
                      ),
                    ),
                  ],
                ),
    );
  }
}
