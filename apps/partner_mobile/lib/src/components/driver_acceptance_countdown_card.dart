import 'dart:async';
import 'package:flutter/material.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class DriverAcceptanceCountdownCard extends StatefulWidget {
  final String orderId;
  final String verticalType;
  final String pickupAddress;
  final String dropoffAddress;
  final double estimatedEarningsInr;
  final int initialCountdownSeconds;
  final VoidCallback onAccept;
  final VoidCallback onReject;
  final VoidCallback? onTimeout;

  const DriverAcceptanceCountdownCard({
    super.key,
    required this.orderId,
    required this.verticalType,
    required this.pickupAddress,
    required this.dropoffAddress,
    required this.estimatedEarningsInr,
    this.initialCountdownSeconds = 15,
    required this.onAccept,
    required this.onReject,
    this.onTimeout,
  });

  @override
  State<DriverAcceptanceCountdownCard> createState() =>
      _DriverAcceptanceCountdownCardState();
}

class _DriverAcceptanceCountdownCardState
    extends State<DriverAcceptanceCountdownCard> {
  late int _secondsLeft;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _secondsLeft = widget.initialCountdownSeconds;
    _startTimer();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      if (_secondsLeft > 1) {
        setState(() => _secondsLeft--);
      } else {
        timer.cancel();
        setState(() => _secondsLeft = 0);
        if (widget.onTimeout != null) {
          widget.onTimeout!();
        } else {
          widget.onReject();
        }
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final progress = _secondsLeft / widget.initialCountdownSeconds;

    return Container(
      margin: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AllGoColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: _secondsLeft <= 5 ? AllGoColors.error : AllGoColors.primary,
          width: 2,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.12),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 15-second countdown progress bar
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 6,
              backgroundColor: AllGoColors.divider,
              valueColor: AlwaysStoppedAnimation<Color>(
                _secondsLeft <= 5 ? AllGoColors.error : AllGoColors.success,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AllGoColors.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        widget.verticalType.toUpperCase(),
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AllGoColors.primary),
                      ),
                    ),
                    Text(
                      '$_secondsLeft s',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: _secondsLeft <= 5 ? AllGoColors.error : AllGoColors.textPrimary,
                      ),
                    ),
                    Text(
                      '₹${widget.estimatedEarningsInr.toStringAsFixed(0)}',
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AllGoColors.success),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text('Pickup: ${widget.pickupAddress}', style: AllGoTypography.bodyMedium),
                const SizedBox(height: 4),
                Text('Dropoff: ${widget.dropoffAddress}', style: AllGoTypography.bodyMedium),
                const SizedBox(height: 16),
                // Accept / Reject Gesture Sliders / Actions
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: widget.onReject,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AllGoColors.error,
                          side: const BorderSide(color: AllGoColors.error),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        child: const Text('Decline'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 2,
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.check_circle_outline),
                        label: const Text('Swipe / Tap to Accept'),
                        onPressed: widget.onAccept,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AllGoColors.success,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
