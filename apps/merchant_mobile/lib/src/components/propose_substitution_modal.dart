import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class ProposeSubstitutionModal extends ConsumerStatefulWidget {
  final String subOrderId;
  final MerchantOrderItem orderItem;
  final List<ProductItem> catalogProducts;
  final VoidCallback onSubmitted;

  const ProposeSubstitutionModal({
    super.key,
    required this.subOrderId,
    required this.orderItem,
    required this.catalogProducts,
    required this.onSubmitted,
  });

  static Future<void> show(
    BuildContext context, {
    required String subOrderId,
    required MerchantOrderItem orderItem,
    required List<ProductItem> catalogProducts,
    required VoidCallback onSubmitted,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => ProposeSubstitutionModal(
        subOrderId: subOrderId,
        orderItem: orderItem,
        catalogProducts: catalogProducts,
        onSubmitted: onSubmitted,
      ),
    );
  }

  @override
  ConsumerState<ProposeSubstitutionModal> createState() => _ProposeSubstitutionModalState();
}

class _ProposeSubstitutionModalState extends ConsumerState<ProposeSubstitutionModal> {
  String _actionType = 'SUBSTITUTE';
  ProductItem? _selectedReplacement;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    final available = widget.catalogProducts
        .where((p) => p.isInStock && p.id != widget.orderItem.itemId)
        .toList();
    if (available.isNotEmpty) {
      _selectedReplacement = available.first;
    } else {
      _actionType = 'REMOVE';
    }
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);
    try {
      await ref.read(apiClientProvider).proposeSubstitution(
        subOrderId: widget.subOrderId,
        orderItemId: widget.orderItem.itemId,
        originalItemName: widget.orderItem.itemName,
        originalPriceInr: widget.orderItem.unitPriceInr,
        actionType: _actionType,
        substitutedItemId: _actionType == 'SUBSTITUTE' ? _selectedReplacement?.id : null,
        substitutedItemName: _actionType == 'SUBSTITUTE' ? _selectedReplacement?.name : null,
        substitutedPriceInr: _actionType == 'SUBSTITUTE' ? _selectedReplacement?.effectivePriceInr : null,
      );
      if (mounted) {
        Navigator.of(context).pop();
        widget.onSubmitted();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Substitution proposal sent to customer!')),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _submitting = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final replacements = widget.catalogProducts
        .where((p) => p.isInStock && p.id != widget.orderItem.itemId)
        .toList();

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom + 20,
          top: 20,
          left: 20,
          right: 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Out-of-Stock Action', style: AllGoTypography.heading3),
            const SizedBox(height: 6),
            Text(
              'Item: ${widget.orderItem.itemName} (₹${widget.orderItem.unitPriceInr.toStringAsFixed(0)})',
              style: AllGoTypography.caption,
            ),
            const SizedBox(height: 12),
            RadioListTile<String>(
              value: 'SUBSTITUTE',
              groupValue: _actionType,
              title: const Text('Propose Alternative Item'),
              onChanged: replacements.isEmpty ? null : (v) => setState(() => _actionType = v!),
            ),
            if (_actionType == 'SUBSTITUTE' && replacements.isNotEmpty)
              DropdownButtonFormField<ProductItem>(
                value: _selectedReplacement,
                items: replacements
                    .map((p) => DropdownMenuItem(
                          value: p,
                          child: Text('${p.name} (₹${p.effectivePriceInr.toStringAsFixed(0)})'),
                        ))
                    .toList(),
                onChanged: (p) => setState(() => _selectedReplacement = p),
                decoration: const InputDecoration(
                  labelText: 'Replacement Product',
                  border: OutlineInputBorder(),
                ),
              ),
            RadioListTile<String>(
              value: 'REMOVE',
              groupValue: _actionType,
              title: const Text('Remove Item & Refund Customer'),
              onChanged: (v) => setState(() => _actionType = v!),
            ),
            const SizedBox(height: 14),
            AllGoButton(
              label: _actionType == 'SUBSTITUTE' ? 'Send Substitution Proposal' : 'Remove & Trigger Refund',
              isLoading: _submitting,
              onPressed: _submit,
            ),
          ],
        ),
      ),
    );
  }
}
