import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import '../components/product_customizer_modal.dart';
import '../providers/customer_home_provider.dart';
import '../widgets/empty_state_view.dart';
import '../widgets/app_network_image.dart';
import 'cart_screen.dart';
import 'outlet_catalog_screen.dart';

class QuickMartScreen extends ConsumerStatefulWidget {
  const QuickMartScreen({super.key});

  @override
  ConsumerState<QuickMartScreen> createState() => _QuickMartScreenState();
}

class _QuickMartScreenState extends ConsumerState<QuickMartScreen> {
  String _selectedAisle = 'ALL';
  String? _activeOutletId;
  String? _activeOutletName;
  bool _isLoadingProducts = false;
  List<ProductItem> _products = [];
  CartModel? _cart;
  final TextEditingController _searchCtrl = TextEditingController();

  static const List<Map<String, dynamic>> _aisles = [
    {'key': 'ALL', 'label': 'All', 'icon': Icons.apps},
    {'key': 'FRUITS', 'label': 'Fruits & Veg', 'icon': Icons.eco},
    {'key': 'DAIRY', 'label': 'Dairy & Bread', 'icon': Icons.egg_alt},
    {'key': 'SNACKS', 'label': 'Snacks', 'icon': Icons.cookie},
    {'key': 'BEVERAGES', 'label': 'Drinks', 'icon': Icons.local_drink},
    {'key': 'STAPLES', 'label': 'Staples', 'icon': Icons.kitchen},
    {'key': 'HOUSEHOLD', 'label': 'Home Care', 'icon': Icons.cleaning_services},
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadStoreProducts());
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadStoreProducts({String? outletId}) async {
    final outlets = ref
        .read(customerHomeProvider)
        .outlets
        .where((o) => o.verticalType == 'GROCERY')
        .toList();

    if (outlets.isEmpty) return;

    final store = outletId != null
        ? outlets.firstWhere((o) => o.outletId == outletId, orElse: () => outlets.first)
        : outlets.first;
    setState(() {
      _activeOutletId = store.outletId;
      _activeOutletName = store.outletName;
      _isLoadingProducts = true;
    });

    try {
      final client = ref.read(apiClientProvider);
      final results = await Future.wait<dynamic>([
        client.getCustomerOutletProducts(store.outletId),
        client.getCart().catchError((_) => CartModel.empty()),
      ]);
      final prodData = results[0] as Map<String, dynamic>;
      final items = (prodData['items'] as List<dynamic>?) ?? [];
      if (mounted) {
        setState(() {
          _products = items.map((e) => ProductItem.fromJson(e as Map<String, dynamic>)).toList();
          _cart = results[1] as CartModel;
          _isLoadingProducts = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingProducts = false);
    }
  }

  int _qtyFor(String productId) {
    final item = _cart?.items.where((i) => i.itemId == productId).firstOrNull;
    return item?.quantity ?? 0;
  }

  Future<void> _addItem(ProductItem product, {String? variantId}) async {
    if (_activeOutletId == null) return;
    try {
      final updated = await ref.read(apiClientProvider).addToCart(
        outletId: _activeOutletId!,
        productId: product.id,
        quantity: 1,
        variantId: variantId,
      );
      if (mounted) setState(() => _cart = updated);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Unable to add: $e')));
      }
    }
  }

  Future<void> _decrementItem(ProductItem product) async {
    final cartItem = _cart?.items.where((i) => i.itemId == product.id).firstOrNull;
    if (cartItem == null) return;
    final client = ref.read(apiClientProvider);
    final updated = cartItem.quantity <= 1
        ? await client.removeCartItem(cartItem.id)
        : await client.updateCartItemQuantity(cartItem.id, cartItem.quantity - 1);
    if (mounted) setState(() => _cart = updated);
  }

  @override
  Widget build(BuildContext context) {
    final groceryOutlets = ref
        .watch(customerHomeProvider)
        .outlets
        .where((o) => o.verticalType == 'GROCERY')
        .toList();

    final query = _searchCtrl.text.trim().toLowerCase();
    final filtered = _products.where((p) {
      final matchesAisle = _selectedAisle == 'ALL' ||
          p.categoryName.toUpperCase().contains(_selectedAisle);
      final matchesQuery = query.isEmpty ||
          p.name.toLowerCase().contains(query) ||
          (p.description?.toLowerCase().contains(query) ?? false);
      return matchesAisle && matchesQuery;
    }).toList();

    final cartCount = _cart?.items.fold<int>(0, (sum, i) => sum + i.quantity) ?? 0;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('AllGo Quick Mart', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            Text(
              _activeOutletName != null
                  ? '$_activeOutletName • Express 15-min delivery'
                  : 'Express neighborhood groceries',
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.normal),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: Badge(
              isLabelVisible: cartCount > 0,
              label: Text('$cartCount'),
              child: const Icon(Icons.shopping_bag_outlined),
            ),
            onPressed: () {
              Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CartScreen())).then((_) {
                _loadStoreProducts();
              });
            },
          ),
        ],
      ),
      body: groceryOutlets.isEmpty
          ? EmptyStateView(
              icon: Icons.local_grocery_store_outlined,
              title: 'No Quick Mart stores nearby',
              message: 'No active grocery stores deliver to your selected address yet.',
              actionLabel: 'Browse All Stores',
              onAction: () => Navigator.of(context).pop(),
            )
          : Column(
              children: [
                if (groceryOutlets.length > 1)
                  SizedBox(
                    height: 44,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      itemCount: groceryOutlets.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 8),
                      itemBuilder: (ctx, i) {
                        final store = groceryOutlets[i];
                        final isSelected = store.outletId == _activeOutletId;
                        return ChoiceChip(
                          selected: isSelected,
                          label: Text('${store.outletName} (${store.estimatedDeliveryMins}m)'),
                          onSelected: (_) => _loadStoreProducts(outletId: store.outletId),
                        );
                      },
                    ),
                  ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
                  child: TextField(
                    controller: _searchCtrl,
                    onChanged: (_) => setState(() {}),
                    decoration: const InputDecoration(
                      hintText: 'Search milk, bread, fruits, snacks...',
                      prefixIcon: Icon(Icons.search),
                      isDense: true,
                    ),
                  ),
                ),
                Expanded(
                  child: Row(
                    children: [
                      // Left Aisle Sidebar
                      Container(
                        width: 86,
                        color: Theme.of(context).cardColor,
                        child: ListView.builder(
                          itemCount: _aisles.length,
                          itemBuilder: (ctx, idx) {
                            final aisle = _aisles[idx];
                            final selected = _selectedAisle == aisle['key'];
                            return InkWell(
                              onTap: () => setState(() => _selectedAisle = aisle['key'] as String),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 6),
                                decoration: BoxDecoration(
                                  color: selected ? AllGoColors.primary.withValues(alpha: 0.1) : null,
                                  border: Border(
                                    left: BorderSide(
                                      color: selected ? AllGoColors.primary : Colors.transparent,
                                      width: 3,
                                    ),
                                  ),
                                ),
                                child: Column(
                                  children: [
                                    Icon(
                                      aisle['icon'] as IconData,
                                      size: 20,
                                      color: selected ? AllGoColors.primary : AllGoColors.textSecondary,
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      aisle['label'] as String,
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: selected ? FontWeight.bold : FontWeight.normal,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                      const VerticalDivider(width: 1),
                      // Product Grid
                      Expanded(
                        child: _isLoadingProducts
                            ? const Center(child: CircularProgressIndicator())
                            : filtered.isEmpty
                                ? const Center(child: Text('No products in this aisle'))
                                : GridView.builder(
                                    padding: const EdgeInsets.all(10),
                                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                      crossAxisCount: 2,
                                      childAspectRatio: 0.68,
                                      crossAxisSpacing: 8,
                                      mainAxisSpacing: 8,
                                    ),
                                    itemCount: filtered.length,
                                    itemBuilder: (ctx, idx) {
                                      final p = filtered[idx];
                                      final qty = _qtyFor(p.id);
                                      final lowStock = p.isInStock && p.stockQuantity > 0 && p.stockQuantity <= 5;
                                      return Card(
                                        child: Padding(
                                          padding: const EdgeInsets.all(8),
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Center(
                                                child: AppNetworkImage(
                                                  imageUrl: p.imageUrl ?? (p.images.isNotEmpty ? p.images.first : null),
                                                  width: 72,
                                                  height: 72,
                                                  borderRadius: BorderRadius.circular(8),
                                                  fallbackIcon: Icons.shopping_basket_outlined,
                                                ),
                                              ),
                                              const SizedBox(height: 6),
                                              if (lowStock)
                                                Text(
                                                  'Only ${p.stockQuantity} left',
                                                  style: const TextStyle(
                                                    fontSize: 10,
                                                    fontWeight: FontWeight.bold,
                                                    color: AllGoColors.error,
                                                  ),
                                                ),
                                              Text(
                                                p.name,
                                                maxLines: 2,
                                                overflow: TextOverflow.ellipsis,
                                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                              ),
                                              if (p.unit != null)
                                                Text(p.unit!, style: AllGoTypography.caption.copyWith(fontSize: 10)),
                                              const Spacer(),
                                              Row(
                                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                children: [
                                                  Text(
                                                    '₹${p.effectivePriceInr.toStringAsFixed(0)}',
                                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                                  ),
                                                  if (!p.isInStock)
                                                    const Text('OOS', style: TextStyle(fontSize: 10, color: Colors.grey))
                                                  else if (qty == 0)
                                                    OutlinedButton(
                                                      style: OutlinedButton.styleFrom(
                                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                                                        minimumSize: Size.zero,
                                                      ),
                                                      onPressed: () {
                                                        if (p.optionGroups.isNotEmpty) {
                                                          showModalBottomSheet(
                                                            context: context,
                                                            isScrollControlled: true,
                                                            builder: (_) => ProductCustomizerModal(
                                                              product: p,
                                                              optionGroups: p.optionGroups,
                                                              onAddToCart: (_, __) => _addItem(p),
                                                            ),
                                                          );
                                                        } else {
                                                          _addItem(p);
                                                        }
                                                      },
                                                      child: const Text('ADD', style: TextStyle(fontSize: 11)),
                                                    )
                                                  else
                                                    Row(
                                                      children: [
                                                        InkWell(
                                                          onTap: () => _decrementItem(p),
                                                          child: const Icon(Icons.remove_circle_outline, size: 20),
                                                        ),
                                                        Padding(
                                                          padding: const EdgeInsets.symmetric(horizontal: 4),
                                                          child: Text('$qty', style: const TextStyle(fontWeight: FontWeight.bold)),
                                                        ),
                                                        InkWell(
                                                          onTap: () => _addItem(p),
                                                          child: const Icon(Icons.add_circle_outline, size: 20),
                                                        ),
                                                      ],
                                                    ),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ),
                                      );
                                    },
                                  ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}
