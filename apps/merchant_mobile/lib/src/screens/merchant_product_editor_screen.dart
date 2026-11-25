import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class MerchantProductEditorScreen extends ConsumerStatefulWidget {
  final ProductItem? existingProduct;
  final String outletId;

  const MerchantProductEditorScreen({
    super.key,
    this.existingProduct,
    required this.outletId,
  });

  @override
  ConsumerState<MerchantProductEditorScreen> createState() => _MerchantProductEditorScreenState();
}

class _MerchantProductEditorScreenState extends ConsumerState<MerchantProductEditorScreen> {
  final _nameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();
  final _salePriceCtrl = TextEditingController();
  final _stockCtrl = TextEditingController(text: '50');
  final _prepCtrl = TextEditingController(text: '15');
  final _variantNameCtrl = TextEditingController();
  final _variantPriceCtrl = TextEditingController();
  final _groupNameCtrl = TextEditingController();
  final _optionNameCtrl = TextEditingController();
  final _optionPriceCtrl = TextEditingController();

  bool _isVeg = true;
  bool _isPerishable = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final p = widget.existingProduct;
    if (p != null) {
      _nameCtrl.text = p.name;
      _descCtrl.text = p.description ?? '';
      _priceCtrl.text = p.basePriceInr.toStringAsFixed(0);
      if (p.salePriceInr != null) _salePriceCtrl.text = p.salePriceInr!.toStringAsFixed(0);
      _stockCtrl.text = '${p.stockQuantity}';
      _prepCtrl.text = '${p.preparationTimeMinutes}';
      _isVeg = p.isVeg;
      _isPerishable = p.isPerishable;
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _priceCtrl.dispose();
    _salePriceCtrl.dispose();
    _stockCtrl.dispose();
    _prepCtrl.dispose();
    _variantNameCtrl.dispose();
    _variantPriceCtrl.dispose();
    _groupNameCtrl.dispose();
    _optionNameCtrl.dispose();
    _optionPriceCtrl.dispose();
    super.dispose();
  }

  Future<void> _saveProduct() async {
    if (_nameCtrl.text.trim().isEmpty) return;
    setState(() => _saving = true);
    final client = ref.read(apiClientProvider);
    final payload = <String, dynamic>{
      'name': _nameCtrl.text.trim(),
      'description': _descCtrl.text.trim(),
      'basePriceInr': double.tryParse(_priceCtrl.text) ?? 100.0,
      if (_salePriceCtrl.text.trim().isNotEmpty)
        'salePriceInr': double.tryParse(_salePriceCtrl.text.trim()),
      'stockQuantity': int.tryParse(_stockCtrl.text) ?? 50,
      'preparationTimeMinutes': int.tryParse(_prepCtrl.text) ?? 15,
      'isVeg': _isVeg,
      'isPerishable': _isPerishable,
    };

    try {
      String productId;
      if (widget.existingProduct == null) {
        final created = await client.createOutletProduct(widget.outletId, payload);
        productId = created.id;
      } else {
        productId = widget.existingProduct!.id;
        await client.updateCatalogProduct(productId, payload);
      }

      if (_variantNameCtrl.text.trim().isNotEmpty) {
        await client.createProductVariant(productId, {
          'variantName': _variantNameCtrl.text.trim(),
          'additionalPriceInr': double.tryParse(_variantPriceCtrl.text) ?? 0.0,
          'variantType': 'SIZE',
        });
      }

      if (_groupNameCtrl.text.trim().isNotEmpty && _optionNameCtrl.text.trim().isNotEmpty) {
        final group = await client.createProductOptionGroup(productId, {
          'name': _groupNameCtrl.text.trim(),
          'minSelections': 0,
          'maxSelections': 3,
        });
        await client.createProductOption(group.id, {
          'name': _optionNameCtrl.text.trim(),
          'priceInr': double.tryParse(_optionPriceCtrl.text) ?? 0.0,
        });
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Product saved!'), backgroundColor: AllGoColors.success),
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Save failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _archiveProduct() async {
    if (widget.existingProduct == null) return;
    setState(() => _saving = true);
    try {
      await ref.read(apiClientProvider).archiveCatalogProduct(widget.existingProduct!.id);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Archive failed: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.existingProduct != null;
    return Scaffold(
      appBar: AppBar(
        title: Text(isEdit ? 'Edit Product' : 'Add Catalog Product'),
        actions: [
          if (isEdit)
            IconButton(
              icon: const Icon(Icons.delete_outline, color: AllGoColors.error),
              tooltip: 'Archive Product',
              onPressed: _saving ? null : _archiveProduct,
            ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          AllGoTextField(label: 'Item Name', controller: _nameCtrl),
          const SizedBox(height: 12),
          AllGoTextField(label: 'Description', controller: _descCtrl),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: AllGoTextField(
                  label: 'Base Price (₹)',
                  controller: _priceCtrl,
                  keyboardType: TextInputType.number,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: AllGoTextField(
                  label: 'Sale Price (₹)',
                  controller: _salePriceCtrl,
                  keyboardType: TextInputType.number,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: AllGoTextField(
                  label: 'Stock Quantity',
                  controller: _stockCtrl,
                  keyboardType: TextInputType.number,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: AllGoTextField(
                  label: 'Prep Time (mins)',
                  controller: _prepCtrl,
                  keyboardType: TextInputType.number,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SwitchListTile(
            value: _isVeg,
            title: Text(_isVeg ? 'Vegetarian' : 'Non-Vegetarian'),
            onChanged: (v) => setState(() => _isVeg = v),
          ),
          SwitchListTile(
            value: _isPerishable,
            title: const Text('Perishable / Fresh Item'),
            onChanged: (v) => setState(() => _isPerishable = v),
          ),
          const Divider(height: 24),
          Text('Optional Pack / Size Variant', style: AllGoTypography.heading3.copyWith(fontSize: 15)),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: AllGoTextField(label: 'Variant (e.g. 1kg / Full)', controller: _variantNameCtrl)),
              const SizedBox(width: 12),
              Expanded(
                child: AllGoTextField(
                  label: 'Extra Price (₹)',
                  controller: _variantPriceCtrl,
                  keyboardType: TextInputType.number,
                ),
              ),
            ],
          ),
          const Divider(height: 24),
          Text('Optional Add-on Group', style: AllGoTypography.heading3.copyWith(fontSize: 15)),
          const SizedBox(height: 8),
          AllGoTextField(label: 'Group Name (e.g. Extra Toppings)', controller: _groupNameCtrl),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: AllGoTextField(label: 'Option Name', controller: _optionNameCtrl)),
              const SizedBox(width: 12),
              Expanded(
                child: AllGoTextField(
                  label: 'Option Price (₹)',
                  controller: _optionPriceCtrl,
                  keyboardType: TextInputType.number,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          AllGoButton(
            label: isEdit ? 'Save Changes' : 'Create Product',
            isLoading: _saving,
            onPressed: _saveProduct,
          ),
        ],
      ),
    );
  }
}
