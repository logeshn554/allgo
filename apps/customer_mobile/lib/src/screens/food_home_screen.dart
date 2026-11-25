import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import '../providers/customer_home_provider.dart';
import '../widgets/empty_state_view.dart';
import 'outlet_catalog_screen.dart';

class FoodHomeScreen extends ConsumerStatefulWidget {
  const FoodHomeScreen({super.key});

  @override
  ConsumerState<FoodHomeScreen> createState() => _FoodHomeScreenState();
}

class _FoodHomeScreenState extends ConsumerState<FoodHomeScreen> {
  final TextEditingController _searchCtrl = TextEditingController();
  bool _vegOnly = false;
  bool _under30Mins = false;
  bool _rating4Plus = false;
  String _sortBy = 'POPULAR';

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final homeState = ref.watch(customerHomeProvider);
    final query = _searchCtrl.text.trim().toLowerCase();

    var foodOutlets = homeState.outlets
        .where((o) => o.verticalType == 'FOOD' || o.verticalType == 'HOME_MADE')
        .toList();

    if (query.isNotEmpty) {
      foodOutlets = foodOutlets
          .where((o) =>
              o.outletName.toLowerCase().contains(query) ||
              o.businessName.toLowerCase().contains(query))
          .toList();
    }
    if (_under30Mins) {
      foodOutlets = foodOutlets.where((o) => o.estimatedDeliveryMins <= 30).toList();
    }
    if (_rating4Plus) {
      foodOutlets = foodOutlets.where((o) => o.rating >= 4.0).toList();
    }
    if (_sortBy == 'TIME') {
      foodOutlets.sort((a, b) => a.estimatedDeliveryMins.compareTo(b.estimatedDeliveryMins));
    } else if (_sortBy == 'RATING') {
      foodOutlets.sort((a, b) => b.rating.compareTo(a.rating));
    }

    return Scaffold(
      appBar: AppBar(title: const Text('AllGo Food')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: _searchCtrl,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                hintText: 'Search restaurants, cuisines, or home kitchens...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: query.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchCtrl.clear();
                          setState(() {});
                        },
                      )
                    : null,
              ),
            ),
          ),
          SizedBox(
            height: 40,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                FilterChip(
                  label: const Text('Pure Veg'),
                  selected: _vegOnly,
                  onSelected: (v) => setState(() => _vegOnly = v),
                ),
                const SizedBox(width: 8),
                FilterChip(
                  label: const Text('Fast Delivery (≤30m)'),
                  selected: _under30Mins,
                  onSelected: (v) => setState(() => _under30Mins = v),
                ),
                const SizedBox(width: 8),
                FilterChip(
                  label: const Text('Rated 4.0+'),
                  selected: _rating4Plus,
                  onSelected: (v) => setState(() => _rating4Plus = v),
                ),
                const SizedBox(width: 8),
                ChoiceChip(
                  label: const Text('Fastest'),
                  selected: _sortBy == 'TIME',
                  onSelected: (v) => setState(() => _sortBy = v ? 'TIME' : 'POPULAR'),
                ),
                const SizedBox(width: 8),
                ChoiceChip(
                  label: const Text('Top Rated'),
                  selected: _sortBy == 'RATING',
                  onSelected: (v) => setState(() => _sortBy = v ? 'RATING' : 'POPULAR'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: homeState.isLoading
                ? const Center(child: CircularProgressIndicator())
                : foodOutlets.isEmpty
                    ? EmptyStateView(
                        icon: Icons.restaurant_outlined,
                        title: 'No restaurants nearby',
                        message: 'Try clearing filters or changing your delivery address.',
                        actionLabel: 'Refresh',
                        onAction: () => ref.read(customerHomeProvider.notifier).loadDiscovery(),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: foodOutlets.length,
                        itemBuilder: (ctx, idx) {
                          final o = foodOutlets[idx];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: Colors.orange.withValues(alpha: 0.12),
                                child: const Icon(Icons.restaurant, color: Colors.orange),
                              ),
                              title: Text(o.outletName, style: const TextStyle(fontWeight: FontWeight.bold)),
                              subtitle: Text(
                                '${o.estimatedDeliveryMins} mins • ${o.distanceKm.toStringAsFixed(1)} km • ★ ${o.rating.toStringAsFixed(1)}',
                              ),
                              trailing: Chip(
                                label: Text(o.isOpen ? 'OPEN' : 'CLOSED', style: const TextStyle(fontSize: 10)),
                              ),
                              onTap: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => OutletCatalogScreen(
                                      outletId: o.outletId,
                                      outletName: o.outletName,
                                      categoryName: o.verticalType,
                                    ),
                                  ),
                                );
                              },
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
