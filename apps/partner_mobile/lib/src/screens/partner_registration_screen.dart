import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import 'approval_status_screen.dart';
import '../components/partner_upload_button.dart';
import '../components/partner_service_selector.dart';

class PartnerRegistrationScreen extends ConsumerStatefulWidget {
  const PartnerRegistrationScreen({super.key});

  @override
  ConsumerState<PartnerRegistrationScreen> createState() => _PartnerRegistrationScreenState();
}

class _PartnerRegistrationScreenState extends ConsumerState<PartnerRegistrationScreen> {
  final _formKey = GlobalKey<FormState>();

  String _selectedVehicle = 'MOTORCYCLE';
  final _regNumberController = TextEditingController();
  final _makeModelController = TextEditingController();
  final _bankAccountController = TextEditingController();
  final _ifscController = TextEditingController();
  final _beneficiaryController = TextEditingController();
  final _dlNumberController = TextEditingController();

  // Supported onboarding service categories: FOOD_DELIVERY, PARCEL, BIKE_TAXI
  final Set<String> _selectedServices = {'FOOD_DELIVERY'};
  bool _isUploadingDl = false;
  bool _isUploadingRc = false;
  String? _dlTicketId;
  String? _rcTicketId;

  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void dispose() {
    _regNumberController.dispose();
    _makeModelController.dispose();
    _bankAccountController.dispose();
    _ifscController.dispose();
    _beneficiaryController.dispose();
    _dlNumberController.dispose();
    super.dispose();
  }

  Future<void> _handleUpload(String docType) async {
    setState(() {
      if (docType == 'DRIVING_LICENSE') _isUploadingDl = true;
      if (docType == 'VEHICLE_RC') _isUploadingRc = true;
      _errorMessage = null;
    });

    try {
      final client = ref.read(apiClientProvider);
      final ticket = await client.createUploadTicket(docType, 'application/pdf', 2048576);
      final ticketId = ticket['ticketId'] as String;
      final dummyPdfBytes = [0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34];
      await client.uploadDocumentBinary(ticketId, dummyPdfBytes);

      setState(() {
        if (docType == 'DRIVING_LICENSE') _dlTicketId = ticketId;
        if (docType == 'VEHICLE_RC') _rcTicketId = ticketId;
      });
    } catch (e) {
      setState(() => _errorMessage = 'Upload failed: $e');
    } finally {
      setState(() {
        if (docType == 'DRIVING_LICENSE') _isUploadingDl = false;
        if (docType == 'VEHICLE_RC') _isUploadingRc = false;
      });
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_dlTicketId == null || _rcTicketId == null) {
      setState(() => _errorMessage = 'Please upload both Driving License and Vehicle RC documents.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final client = ref.read(apiClientProvider);

      await client.registerPartner({
        'vehicleType': _selectedVehicle,
        'vehicleRegistrationNumber': _regNumberController.text.trim().toUpperCase(),
        'vehicleMakeModel': _makeModelController.text.trim(),
        'bankAccountNumber': _bankAccountController.text.trim(),
        'bankIfscCode': _ifscController.text.trim().toUpperCase(),
        'bankBeneficiaryName': _beneficiaryController.text.trim(),
        'city': 'Chennai',
      });

      for (final service in _selectedServices) {
        await client.applyPartnerService(service);
      }

      if (_dlTicketId != null) {
        await client.submitPartnerDocument(
          'DRIVING_LICENSE',
          _dlTicketId!,
          documentNumber: _dlNumberController.text.trim().toUpperCase(),
        );
      }
      if (_rcTicketId != null) {
        await client.submitPartnerDocument(
          'VEHICLE_RC',
          _rcTicketId!,
          documentNumber: _regNumberController.text.trim().toUpperCase(),
        );
      }

      await client.submitPartnerApplication();

      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const ApprovalStatusScreen()),
        );
      }
    } catch (e) {
      setState(() => _errorMessage = 'Submission failed: $e');
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AllGoColors.background,
      appBar: const AllGoAppBar(title: 'Partner Onboarding Registration'),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Vehicle & Banking Information', style: AllGoTypography.heading2),
                const SizedBox(height: 8),
                Text(
                  'Provide your vehicle, bank, and regulatory identity details to start delivering with AllGo.',
                  style: AllGoTypography.subtitle,
                ),
                const SizedBox(height: 20),

                if (_errorMessage != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AllGoColors.error.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AllGoColors.error),
                    ),
                    child: Text(_errorMessage!, style: const TextStyle(color: AllGoColors.error, fontSize: 13)),
                  ),
                  const SizedBox(height: 16),
                ],

                Text('Vehicle Type', style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.bold)),
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
                      value: _selectedVehicle,
                      isExpanded: true,
                      items: const [
                        DropdownMenuItem(value: 'BICYCLE', child: Text('Bicycle (Hyperlocal Delivery)')),
                        DropdownMenuItem(value: 'MOTORCYCLE', child: Text('Motorcycle / Scooter (Deliveries & Bike Taxi)')),
                        DropdownMenuItem(value: 'AUTO_RICKSHAW', child: Text('Auto Rickshaw (Mobility & Parcels)')),
                        DropdownMenuItem(value: 'CAB_SEDAN', child: Text('Cab Sedan (Passenger Mobility)')),
                      ],
                      onChanged: (val) {
                        if (val != null) setState(() => _selectedVehicle = val);
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                AllGoTextField(
                  label: 'Vehicle Registration Plate Number',
                  hint: 'TN 01 AB 1234',
                  controller: _regNumberController,
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 12),

                AllGoTextField(
                  label: 'Make and Model',
                  hint: 'Hero Splendor Plus',
                  controller: _makeModelController,
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 16),

                AllGoTextField(
                  label: 'Bank Account Number',
                  hint: 'Enter your 9-18 digit account number',
                  controller: _bankAccountController,
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 12),

                AllGoTextField(
                  label: 'Bank IFSC Code',
                  hint: 'e.g., SBIN0001234',
                  controller: _ifscController,
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 12),

                AllGoTextField(
                  label: 'Bank Beneficiary Name',
                  hint: 'Name as registered on passbook',
                  controller: _beneficiaryController,
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 16),

                AllGoTextField(
                  label: 'Driving License Number',
                  hint: 'DL-1420110012345',
                  controller: _dlNumberController,
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 20),

                PartnerServiceSelector(
                  selectedServices: _selectedServices,
                  onToggle: (key, isSelected) {
                    setState(() {
                      if (isSelected) {
                        _selectedServices.add(key);
                      } else {
                        _selectedServices.remove(key);
                      }
                    });
                  },
                ),
                const SizedBox(height: 20),

                Text('Mandatory Regulatory Documents (PDF / Images)', style: AllGoTypography.heading3.copyWith(fontSize: 15)),
                const SizedBox(height: 10),
                PartnerUploadButton(
                  label: 'Driving License Copy',
                  docType: 'DRIVING_LICENSE',
                  isUploaded: _dlTicketId != null,
                  isLoading: _isUploadingDl,
                  onUpload: _handleUpload,
                ),
                const SizedBox(height: 10),
                PartnerUploadButton(
                  label: 'Vehicle Registration (RC)',
                  docType: 'VEHICLE_RC',
                  isUploaded: _rcTicketId != null,
                  isLoading: _isUploadingRc,
                  onUpload: _handleUpload,
                ),

                const SizedBox(height: 28),
                AllGoButton(
                  label: 'Submit Onboarding Application',
                  isLoading: _isSubmitting,
                  onPressed: _handleSubmit,
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
