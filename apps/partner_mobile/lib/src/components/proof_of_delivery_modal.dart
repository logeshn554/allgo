import 'package:flutter/material.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class ProofOfDeliveryModal extends StatefulWidget {
  final String jobId;
  final String customerName;
  final Future<void> Function(String otp, String? photoKey) onConfirmDelivery;

  const ProofOfDeliveryModal({
    super.key,
    required this.jobId,
    required this.customerName,
    required this.onConfirmDelivery,
  });

  @override
  State<ProofOfDeliveryModal> createState() => _ProofOfDeliveryModalState();
}

class _ProofOfDeliveryModalState extends State<ProofOfDeliveryModal> {
  final _otpController = TextEditingController();
  bool _isPhotoCaptured = false;
  String? _simulatedPhotoKey;
  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  void _handleSimulateCameraCapture() {
    setState(() {
      _isPhotoCaptured = true;
      _simulatedPhotoKey = 'pod/photos/${widget.jobId}_pod_${DateTime.now().millisecondsSinceEpoch}.jpg';
      _errorMessage = null;
    });
  }

  Future<void> _handleSubmit() async {
    final otp = _otpController.text.trim();
    if (otp.length != 6) {
      setState(() => _errorMessage = 'Please enter valid 6-digit delivery OTP');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      await widget.onConfirmDelivery(otp, _simulatedPhotoKey);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _errorMessage = e.toString().replaceAll('Exception: ', '');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Proof of Delivery (PoD)', style: AllGoTypography.heading2),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text('Recipient: ${widget.customerName}', style: AllGoTypography.subtitle),
            const SizedBox(height: 16),
            // Native Camera Capture Area
            GestureDetector(
              onTap: _handleSimulateCameraCapture,
              child: Container(
                height: 120,
                decoration: BoxDecoration(
                  color: _isPhotoCaptured ? Colors.green.shade50 : Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: _isPhotoCaptured ? Colors.green : Colors.grey.shade400,
                    style: BorderStyle.solid,
                  ),
                ),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        _isPhotoCaptured ? Icons.check_circle : Icons.camera_alt_outlined,
                        size: 36,
                        color: _isPhotoCaptured ? Colors.green : Colors.grey.shade600,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _isPhotoCaptured ? 'Delivery Photo Captured' : 'Tap to Capture Doorstep Photo',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: _isPhotoCaptured ? Colors.green.shade800 : Colors.grey.shade700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            // 6-digit OTP Input
            Text('Customer Delivery OTP (6 digits)', style: AllGoTypography.caption),
            const SizedBox(height: 6),
            TextField(
              controller: _otpController,
              keyboardType: TextInputType.number,
              maxLength: 6,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, letterSpacing: 6),
              textAlign: TextAlign.center,
              decoration: InputDecoration(
                counterText: '',
                hintText: '123456',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
            if (_errorMessage != null) ...[
              const SizedBox(height: 8),
              Text(_errorMessage!, style: const TextStyle(color: AllGoColors.error, fontSize: 12)),
            ],
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _isSubmitting ? null : _handleSubmit,
              style: ElevatedButton.styleFrom(
                backgroundColor: AllGoColors.success,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _isSubmitting
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Confirm Handover & Complete Job', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
