import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class RideCompletionRatingSheet extends ConsumerStatefulWidget {
  final RideModel ride;
  final VoidCallback onDone;

  const RideCompletionRatingSheet({
    super.key,
    required this.ride,
    required this.onDone,
  });

  @override
  ConsumerState<RideCompletionRatingSheet> createState() => _RideCompletionRatingSheetState();
}

class _RideCompletionRatingSheetState extends ConsumerState<RideCompletionRatingSheet> {
  int _stars = 5;
  final Set<String> _tags = {};
  final TextEditingController _feedbackCtrl = TextEditingController();
  bool _submitting = false;

  static const List<String> _rideTags = [
    'Safe Driving',
    'On-Time Pickup',
    'Clean Vehicle',
    'Polite Captain',
    'Smooth Route',
  ];

  @override
  void dispose() {
    _feedbackCtrl.dispose();
    super.dispose();
  }

  Future<void> _submitRating() async {
    setState(() => _submitting = true);
    try {
      await ref.read(apiClientProvider).submitRating({
        'targetType': 'RIDE',
        'targetId': widget.ride.id,
        'score': _stars,
        'tags': _tags.toList(),
        if (_feedbackCtrl.text.trim().isNotEmpty) 'comment': _feedbackCtrl.text.trim(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Thanks for rating your AllGo Ride!'), backgroundColor: AllGoColors.success),
        );
        widget.onDone();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Unable to submit rating: $e')));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(Icons.check_circle, color: AllGoColors.success, size: 48),
                const SizedBox(height: 8),
                Text('Ride Completed', style: AllGoTypography.heading2, textAlign: TextAlign.center),
                const SizedBox(height: 4),
                Text(
                  'Ride #${widget.ride.rideNumber.isNotEmpty ? widget.ride.rideNumber : widget.ride.id.substring(0, 8)}',
                  style: AllGoTypography.caption,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AllGoColors.primary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total Fare Paid', style: TextStyle(fontWeight: FontWeight.bold)),
                      Text(
                        '₹${widget.ride.totalFareInr.toStringAsFixed(0)}',
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AllGoColors.primary),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  'Rate ${widget.ride.driverName ?? "your Captain"}',
                  style: AllGoTypography.heading3,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(5, (i) {
                    final s = i + 1;
                    return IconButton(
                      icon: Icon(
                        s <= _stars ? Icons.star_rounded : Icons.star_outline_rounded,
                        color: Colors.amber,
                        size: 36,
                      ),
                      onPressed: () => setState(() => _stars = s),
                    );
                  }),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  alignment: WrapAlignment.center,
                  children: _rideTags.map((tag) {
                    final selected = _tags.contains(tag);
                    return FilterChip(
                      label: Text(tag, style: const TextStyle(fontSize: 11)),
                      selected: selected,
                      onSelected: (v) => setState(() => v ? _tags.add(tag) : _tags.remove(tag)),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: _feedbackCtrl,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    hintText: 'Share optional feedback...',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                AllGoButton(
                  label: 'Submit & Book Another Ride',
                  isLoading: _submitting,
                  onPressed: _submitRating,
                ),
                TextButton(
                  onPressed: widget.onDone,
                  child: const Text('Skip'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
