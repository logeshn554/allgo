import 'package:flutter/material.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class MerchantMenuCatalogTab extends StatelessWidget {
  final List<ProductItem> products;
  final bool isLoading;
  final VoidCallback onRefresh;
  final void Function(ProductItem product, bool inStock) onToggleStock;
  final VoidCallback onAddProduct;
  final void Function(ProductItem product)? onEditProduct;
  final VoidCallback? onBulkCsvImport;
  final VoidCallback? onAddCategory;
  final void Function(ProductItem product)? onTimedPause;

  const MerchantMenuCatalogTab({
    super.key,
    required this.products,
    required this.isLoading,
    required this.onRefresh,
    required this.onToggleStock,
    required this.onAddProduct,
    this.onEditProduct,
    this.onBulkCsvImport,
    this.onAddCategory,
    this.onTimedPause,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: AllGoButton(
                  label: 'Add Item',
                  icon: Icons.add,
                  onPressed: onAddProduct,
                ),
              ),
              if (onAddCategory != null) ...[
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  icon: const Icon(Icons.category_outlined),
                  label: const Text('Category'),
                  onPressed: onAddCategory,
                ),
              ],
              if (onBulkCsvImport != null) ...[
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  icon: const Icon(Icons.upload_file),
                  label: const Text('CSV'),
                  onPressed: onBulkCsvImport,
                ),
              ],
            ],
          ),
        ),
        Expanded(
          child: isLoading
              ? const Center(child: CircularProgressIndicator())
              : products.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.restaurant_menu, size: 48, color: AllGoColors.textTertiary),
                          const SizedBox(height: 12),
                          Text('No items in menu catalog', style: AllGoTypography.subtitle),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: () async => onRefresh(),
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: products.length,
                        itemBuilder: (context, index) {
                          final product = products[index];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 10),
                            child: ListTile(
                              onTap: onEditProduct != null ? () => onEditProduct!(product) : null,
                              leading: Icon(
                                Icons.circle,
                                size: 16,
                                color: product.isVeg ? Colors.green : Colors.red,
                              ),
                              title: Text(product.name, style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.bold)),
                              subtitle: Text('₹${product.basePriceInr.toStringAsFixed(0)} • Stock: ${product.stockQuantity}', style: AllGoTypography.caption),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  if (onTimedPause != null && product.isInStock)
                                    IconButton(
                                      icon: const Icon(Icons.pause_circle_outline, size: 20),
                                      tooltip: 'Pause item for 2 hours',
                                      onPressed: () => onTimedPause!(product),
                                    ),
                                  Switch(
                                    value: product.isInStock,
                                    activeColor: AllGoColors.success,
                                    onChanged: (val) => onToggleStock(product, val),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
        ),
      ],
    );
  }
}
