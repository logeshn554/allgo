import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class SubstitutionDecisionSheet extends ConsumerStatefulWidget {
  final String substitutionId;
  final String originalItemName;
  final double originalPriceInr;
  final String actionType;
  final String? substitutedItemName;
  final double? substitutedPriceInr;
  final VoidCallback onResolved;

  const SubstitutionDecisionSheet({
    super.key,
    required this.substitutionId,
    required this.originalItemName,
    required this.originalPriceInr,
    required this.actionType,
    this.substitutedItemName,
    this.substitutedPriceInr,
    required this.onResolved,
  });

  static Future<void> show(
    BuildContext context, {
    required String substitutionId,
    required String originalItemName,
    required double originalPriceInr,
    required String actionType,
    String? substitutedItemName,
    double? substitutedPriceInr,
    required VoidCallback onResolved,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      isDismissible: false,
      builder: (_) => SubstitutionDecisionSheet(
        substitutionId: substitutionId,
        originalItemName: originalItemName,
        originalPriceInr: originalPriceInr,
        actionType: actionType,
        substitutedItemName: substitutedItemName,
        substitutedPriceInr: substitutedPriceInr,
        onResolved: onResolved,
      ),
    );
  }

  @override
  ConsumerState<SubstitutionDecisionSheet> createState() => _SubstitutionDecisionSheetState();
}

class _SubstitutionDecisionSheetState extends ConsumerState<SubstitutionDecisionSheet> {
  bool _submitting = false;

  Future<void> _sendDecision(String decision) async {
    setState(() => _submitting = true);
    try {
      final res = await ref.read(apiClientProvider).respondToSubstitution(
        substitutionId: widget.substitutionId,
        decision: decision,
      );
      if (mounted) {
        final msg = res['message']?.toString() ?? 'Substitution updated ($decision)';
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
        Navigator.of(context).pop();
        widget.onResolved();
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
    final isRemove = widget.actionType == 'REMOVE';
    final diff = widget.originalPriceInr - (widget.substitutedPriceInr ?? 0);

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Icon(Icons.swap_horiz, color: AllGoColors.primary, size: 28),
                const SizedBox(width: 10),
                Expanded(
                  child: Text('Item Substitution Request', style: AllGoTypography.heading3),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              'Unavailable Item: ${widget.originalItemName} (₹${widget.originalPriceInr.toStringAsFixed(0)})',
              style: AllGoTypography.bodyMedium,
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AllGoColors.primary.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                isRemove
                    ? 'The store proposes removing this item and refunding ₹${widget.originalPriceInr.toStringAsFixed(0)}.'
                    : 'Proposed replacement: ${widget.substitutedItemName ?? "Alternative"} (₹${(widget.substitutedPriceInr ?? 0).toStringAsFixed(0)}).${diff > 0 ? " Refund delta: ₹${diff.toStringAsFixed(0)}" : ""}',
                style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _submitting ? null : () => _sendDecision('REJECT'),
                    style: OutlinedButton.styleFrom(foregroundColor: AllGoColors.error),
                    child: const Text('Reject & Refund'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _submitting ? null : () => _sendDecision('APPROVE'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AllGoColors.success,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('Approve'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
