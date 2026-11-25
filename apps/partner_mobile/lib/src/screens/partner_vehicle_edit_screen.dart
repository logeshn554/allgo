import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import '../components/partner_upload_button.dart';

class PartnerVehicleEditScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic>? initialVehicle;
  const PartnerVehicleEditScreen({super.key, this.initialVehicle});

  @override
  ConsumerState<PartnerVehicleEditScreen> createState() => _PartnerVehicleEditScreenState();
}

class _PartnerVehicleEditScreenState extends ConsumerState<PartnerVehicleEditScreen> {
  final _formKey = GlobalKey<FormState>();
  final ImagePicker _picker = ImagePicker();
  late String _selectedType;
  late final TextEditingController _makeModelController;
  late final TextEditingController _regNumberController;
  bool _isUploadingRc = false;
  bool _isUploadingInsurance = false;
  bool _rcUploaded = false;
  bool _insuranceUploaded = false;
  bool _isSaving = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    final v = widget.initialVehicle;
    _selectedType = v?['vehicleType'] as String? ?? v?['vehicle_type'] as String? ?? 'MOTORCYCLE';
    _makeModelController = TextEditingController(
      text: v?['makeModel'] as String? ?? v?['make_model'] as String? ?? '',
    );
    _regNumberController = TextEditingController(
      text: v?['registrationNumber'] as String? ?? v?['registration_number'] as String? ?? '',
    );
  }

  @override
  void dispose() {
    _makeModelController.dispose();
    _regNumberController.dispose();
    super.dispose();
  }

  Future<void> _handleDocUpload(String docType) async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Capture with Camera'),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Choose from Gallery'),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
    if (source == null) return;

    setState(() {
      if (docType == 'VEHICLE_RC') _isUploadingRc = true;
      if (docType == 'VEHICLE_INSURANCE') _isUploadingInsurance = true;
      _errorMessage = null;
    });
    try {
      final XFile? file = await _picker.pickImage(source: source, imageQuality: 80, maxWidth: 1800);
      if (file == null) {
        setState(() => _errorMessage = 'Document selection cancelled.');
        return;
      }
      final bytes = await file.readAsBytes();
      if (bytes.isEmpty) throw Exception('Selected file is empty');

      final client = ref.read(apiClientProvider);
      final ticket = await client.createUploadTicket(docType, 'image/jpeg', bytes.lengthInBytes);
      final ticketId = ticket['ticketId']?.toString() ?? ticket['id']?.toString() ?? '';
      await client.uploadDocumentBinary(ticketId, bytes);
      await client.submitPartnerDocument(
        docType,
        ticketId,
        documentNumber: _regNumberController.text.trim().toUpperCase(),
      );
      setState(() {
        if (docType == 'VEHICLE_RC') _rcUploaded = true;
        if (docType == 'VEHICLE_INSURANCE') _insuranceUploaded = true;
      });
    } catch (e) {
      setState(() => _errorMessage = 'Upload failed: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isUploadingRc = false;
          _isUploadingInsurance = false;
        });
      }
    }
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });
    try {
      final client = ref.read(apiClientProvider);
      await client.registerPartner({
        'vehicleType': _selectedType,
        'registrationNumber': _regNumberController.text.trim().toUpperCase(),
        'makeModel': _makeModelController.text.trim(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Vehicle details updated successfully!'), backgroundColor: AllGoColors.success),
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      setState(() => _errorMessage = 'Failed to save vehicle: $e');
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AllGoColors.background,
      appBar: const AllGoAppBar(title: 'Vehicle Management'),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_errorMessage != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AllGoColors.error.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AllGoColors.error),
                    ),
                    child: Text(_errorMessage!, style: const TextStyle(color: AllGoColors.error, fontSize: 13)),
                  ),
                  const SizedBox(height: 16),
                ],
                Text('Vehicle Category', style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: AllGoColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AllGoColors.divider),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _selectedType,
                      isExpanded: true,
                      items: const [
                        DropdownMenuItem(value: 'MOTORCYCLE', child: Text('Motorcycle / Scooter')),
                        DropdownMenuItem(value: 'AUTO_RICKSHAW', child: Text('Auto Rickshaw')),
                        DropdownMenuItem(value: 'CAB_SEDAN', child: Text('Cab Sedan')),
                        DropdownMenuItem(value: 'BICYCLE', child: Text('Bicycle')),
                      ],
                      onChanged: (val) {
                        if (val != null) setState(() => _selectedType = val);
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                AllGoTextField(
                  label: 'Registration Plate Number',
                  hint: 'Enter vehicle registration plate',
                  controller: _regNumberController,
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Registration plate is required' : null,
                ),
                const SizedBox(height: 14),
                AllGoTextField(
                  label: 'Vehicle Make & Model',
                  hint: 'Enter vehicle make & model',
                  controller: _makeModelController,
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Make & model is required' : null,
                ),
                const SizedBox(height: 18),
                Text('Vehicle Documents Renewal', style: AllGoTypography.heading3.copyWith(fontSize: 15)),
                const SizedBox(height: 10),
                PartnerUploadButton(
                  label: 'Registration Certificate (RC)',
                  docType: 'VEHICLE_RC',
                  isUploaded: _rcUploaded,
                  isLoading: _isUploadingRc,
                  onUpload: _handleDocUpload,
                ),
                const SizedBox(height: 10),
                PartnerUploadButton(
                  label: 'Commercial Insurance Policy',
                  docType: 'VEHICLE_INSURANCE',
                  isUploaded: _insuranceUploaded,
                  isLoading: _isUploadingInsurance,
                  onUpload: _handleDocUpload,
                ),
                const SizedBox(height: 24),
                AllGoButton(label: 'Save Vehicle Details', isLoading: _isSaving, onPressed: _handleSave),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
