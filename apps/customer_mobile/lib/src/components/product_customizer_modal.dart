import 'package:flutter/material.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class ProductCustomizerModal extends StatefulWidget {
  final ProductItem product;
  final List<OptionGroup> optionGroups;
  final void Function(int quantity, List<String> selectedOptionIds) onAddToCart;

  const ProductCustomizerModal({
    super.key,
    required this.product,
    required this.optionGroups,
    required this.onAddToCart,
  });

  @override
  State<ProductCustomizerModal> createState() => _ProductCustomizerModalState();
}

class _ProductCustomizerModalState extends State<ProductCustomizerModal> {
  final int _quantity = 1;
  final Map<String, Set<String>> _selectionsByGroup = {};
  String? _selectedVariantId;

  @override
  void initState() {
    super.initState();
    if (widget.product.variants.isNotEmpty) {
      _selectedVariantId = widget.product.variants.first.id;
    }
    for (final group in widget.optionGroups) {
      _selectionsByGroup[group.id] = {};
      if ((group.isRequired || group.minSelections > 0) && group.options.isNotEmpty) {
        final count = group.minSelections > 0 ? group.minSelections : 1;
        for (var i = 0; i < count && i < group.options.length; i++) {
          _selectionsByGroup[group.id]!.add(group.options[i].id);
        }
      }
    }
  }

  List<String> get _allSelectedOptionIds =>
      _selectionsByGroup.values.expand((s) => s).toList();

  bool get _isValid {
    for (final group in widget.optionGroups) {
      final selectedCount = _selectionsByGroup[group.id]?.length ?? 0;
      final minReq = group.isRequired && group.minSelections == 0 ? 1 : group.minSelections;
      if (selectedCount < minReq) return false;
      if (group.maxSelections > 0 && selectedCount > group.maxSelections) return false;
    }
    return true;
  }

  double get _totalPrice {
    double total = widget.product.effectivePriceInr;
    if (_selectedVariantId != null) {
      final variant = widget.product.variants.where((v) => v.id == _selectedVariantId).firstOrNull;
      if (variant != null) {
        total += variant.additionalPriceInr;
      }
    }
    final selectedIds = _allSelectedOptionIds.toSet();
    for (final group in widget.optionGroups) {
      for (final opt in group.options) {
        if (selectedIds.contains(opt.id)) {
          total += opt.priceModifierInr;
        }
      }
    }
    return total * _quantity;
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          top: 20,
          left: 20,
          right: 20,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(child: Text(widget.product.name, style: AllGoTypography.heading3)),
                  IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
                ],
              ),
              if (widget.product.variants.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text('Choose Size / Pack', style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  children: widget.product.variants.map((v) {
                    final selected = _selectedVariantId == v.id;
                    return ChoiceChip(
                      label: Text('${v.variantName} (+₹${v.additionalPriceInr.toStringAsFixed(0)})'),
                      selected: selected,
                      onSelected: (_) => setState(() => _selectedVariantId = v.id),
                    );
                  }).toList(),
                ),
              ],
              const SizedBox(height: 12),
              ...widget.optionGroups.map((g) {
                final selectedSet = _selectionsByGroup[g.id] ?? {};
                final isSingleSelect = g.maxSelections == 1;
                final minReq = g.isRequired && g.minSelections == 0 ? 1 : g.minSelections;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(g.name, style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.bold)),
                          Text(
                            minReq > 0
                                ? 'Required (min $minReq${g.maxSelections > 0 ? ', max ${g.maxSelections}' : ''})'
                                : 'Optional${g.maxSelections > 0 ? ' (max ${g.maxSelections})' : ''}',
                            style: AllGoTypography.caption.copyWith(
                              color: selectedSet.length < minReq ? AllGoColors.error : AllGoColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                      ...g.options.map((opt) {
                        if (isSingleSelect) {
                          final currentVal = selectedSet.isNotEmpty ? selectedSet.first : null;
                          return RadioListTile<String>(
                            value: opt.id,
                            groupValue: currentVal,
                            title: Text(opt.name),
                            subtitle: Text('+₹${opt.priceModifierInr.toStringAsFixed(0)}'),
                            onChanged: opt.isAvailable
                                ? (val) {
                                    if (val == null) return;
                                    setState(() {
                                      _selectionsByGroup[g.id] = {val};
                                    });
                                  }
                                : null,
                          );
                        }
                        final isChecked = selectedSet.contains(opt.id);
                        return CheckboxListTile(
                          value: isChecked,
                          title: Text(opt.name),
                          subtitle: Text('+₹${opt.priceModifierInr.toStringAsFixed(0)}'),
                          onChanged: opt.isAvailable
                              ? (val) {
                                  setState(() {
                                    final target = _selectionsByGroup.putIfAbsent(g.id, () => {});
                                    if (val == true) {
                                      if (g.maxSelections <= 0 || target.length < g.maxSelections) {
                                        target.add(opt.id);
                                      }
                                    } else {
                                      target.remove(opt.id);
                                    }
                                  });
                                }
                              : null,
                        );
                      }),
                    ],
                  ),
                );
              }),
              const SizedBox(height: 12),
              AllGoButton(
                label: 'Add to Cart - ₹${_totalPrice.toStringAsFixed(0)}',
                onPressed: _isValid
                    ? () {
                        Navigator.pop(context);
                        widget.onAddToCart(_quantity, _allSelectedOptionIds);
                      }
                    : null,
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
