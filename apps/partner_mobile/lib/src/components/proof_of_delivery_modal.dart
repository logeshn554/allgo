import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class ProofOfDeliveryModal extends ConsumerStatefulWidget {
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
  ConsumerState<ProofOfDeliveryModal> createState() => _ProofOfDeliveryModalState();
}

class _ProofOfDeliveryModalState extends ConsumerState<ProofOfDeliveryModal> {
  final _otpController = TextEditingController();
  final ImagePicker _imagePicker = ImagePicker();
  bool _isPhotoCaptured = false;
  Uint8List? _previewBytes;
  String? _uploadedStorageKey;
  bool _isSubmitting = false;
  bool _isUploadingPhoto = false;
  String? _errorMessage;

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _handleCaptureAndUploadPhoto() async {
    setState(() {
      _isUploadingPhoto = true;
      _errorMessage = null;
    });

    try {
      final XFile? photo = await _imagePicker.pickImage(
        source: ImageSource.camera,
        imageQuality: 75,
        maxWidth: 1600,
      );

      if (photo == null) {
        if (mounted) {
          setState(() {
            _isUploadingPhoto = false;
            _errorMessage = 'Camera capture was cancelled. Please capture doorstep photo proof.';
          });
        }
        return;
      }

      final photoBytes = await photo.readAsBytes();
      if (photoBytes.isEmpty) {
        throw Exception('Captured photo was empty');
      }

      final client = ref.read(apiClientProvider);
      final ticket = await client.createUploadTicket(
        'PROOF_OF_DELIVERY',
        'image/jpeg',
        photoBytes.lengthInBytes,
      );

      final ticketId = ticket['ticketId']?.toString() ?? ticket['id']?.toString() ?? '';
      final storageKey = ticket['storageKey']?.toString() ?? ticket['storage_key']?.toString() ?? '';

      await client.uploadDocumentBinary(ticketId, photoBytes);

      if (mounted) {
        setState(() {
          _isPhotoCaptured = true;
          _previewBytes = photoBytes;
          _uploadedStorageKey = storageKey.isNotEmpty ? storageKey : 'pod/${widget.jobId}.jpg';
          _isUploadingPhoto = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isUploadingPhoto = false;
          _errorMessage = 'Photo upload failed: $e';
        });
      }
    }
  }

  Future<void> _handleSubmit() async {
    final otp = _otpController.text.trim();
    if (otp.length != 6) {
      setState(() => _errorMessage = 'Please enter valid 6-digit delivery OTP');
      return;
    }
    if (_uploadedStorageKey == null) {
      setState(() => _errorMessage = 'Photo proof of delivery is required');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      await widget.onConfirmDelivery(otp, _uploadedStorageKey);
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
            // Real Camera Capture & Storage Upload Area
            GestureDetector(
              onTap: (_isUploadingPhoto || _isSubmitting) ? null : _handleCaptureAndUploadPhoto,
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
                  child: _isUploadingPhoto
                      ? const Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            CircularProgressIndicator(),
                            SizedBox(height: 8),
                            Text('Uploading doorstep photo to storage...', style: TextStyle(fontSize: 12)),
                          ],
                        )
                      : Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            if (_previewBytes != null)
                              ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Image.memory(
                                  _previewBytes!,
                                  height: 64,
                                  width: 96,
                                  fit: BoxFit.cover,
                                ),
                              )
                            else
                              Icon(
                                _isPhotoCaptured ? Icons.check_circle : Icons.camera_alt_outlined,
                                size: 36,
                                color: _isPhotoCaptured ? Colors.green : Colors.grey.shade600,
                              ),
                            const SizedBox(height: 6),
                            Text(
                              _isPhotoCaptured ? 'Delivery Photo Uploaded to Storage' : 'Tap Camera to Capture Doorstep Photo',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: _isPhotoCaptured ? Colors.green.shade800 : Colors.grey.shade700,
                              ),
                            ),
                            if (_uploadedStorageKey != null)
                              Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Text(
                                  'Key: $_uploadedStorageKey',
                                  style: const TextStyle(fontSize: 10, color: Colors.grey),
                                  overflow: TextOverflow.ellipsis,
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
              onPressed: (_isSubmitting || _isUploadingPhoto) ? null : _handleSubmit,
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
