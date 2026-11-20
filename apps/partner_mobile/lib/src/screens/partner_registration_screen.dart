import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import 'approval_status_screen.dart';
import '../components/partner_service_selector.dart';
import '../components/document_picker_dialog.dart';
import '../components/partner_banking_and_upi_section.dart';
import '../components/partner_document_upload_grid.dart';
import '../components/partner_vehicle_details_section.dart';

class PartnerRegistrationScreen extends ConsumerStatefulWidget {
  const PartnerRegistrationScreen({super.key});

  @override
  ConsumerState<PartnerRegistrationScreen> createState() => _PartnerRegistrationScreenState();
}

class _PartnerRegistrationScreenState extends ConsumerState<PartnerRegistrationScreen> {
  final _formKey = GlobalKey<FormState>();

  // Supported vehicle types: MOTORCYCLE, AUTO_RICKSHAW, CAB_SEDAN
  // Banking fields: Bank Account Number, Bank IFSC Code, Bank Beneficiary Name
  // Services: FOOD_DELIVERY, PARCEL, BIKE_TAXI
  String _selectedVehicle = 'MOTORCYCLE';
  final _regNumberController = TextEditingController();
  final _makeModelController = TextEditingController();
  final _bankAccountController = TextEditingController();
  final _ifscController = TextEditingController();
  final _beneficiaryController = TextEditingController();
  final _upiController = TextEditingController();
  final _dlNumberController = TextEditingController();

  final Set<String> _selectedServices = {'FOOD_DELIVERY'};
  final Map<String, String?> _ticketIds = {
    'AADHAAR': null,
    'DRIVING_LICENSE': null,
    'VEHICLE_RC': null,
    'VEHICLE_INSURANCE': null,
    'SELFIE': null,
    'BANK_PASSBOOK': null,
  };
  final Map<String, bool> _uploadingStates = {};

  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void dispose() {
    _regNumberController.dispose();
    _makeModelController.dispose();
    _bankAccountController.dispose();
    _ifscController.dispose();
    _beneficiaryController.dispose();
    _upiController.dispose();
    _dlNumberController.dispose();
    super.dispose();
  }

  Future<void> _handleUpload(String docType) async {
    final title = docType == 'SELFIE'
        ? 'Facial Liveness Selfie'
        : 'Attach ${docType.replaceAll('_', ' ')}';

    final pickedDoc = await showDialog<PickedDocument>(
      context: context,
      builder: (_) => DocumentPickerDialog(title: title, documentType: docType),
    );

    if (pickedDoc == null) return;

    setState(() {
      _uploadingStates[docType] = true;
      _errorMessage = null;
    });

    try {
      final client = ref.read(apiClientProvider);
      final ticket = await client.createUploadTicket(
        docType,
        pickedDoc.mimeType,
        pickedDoc.sizeBytes,
      );
      final ticketId = ticket['ticketId'] as String;
      await client.uploadDocumentBinary(ticketId, pickedDoc.bytes);

      setState(() => _ticketIds[docType] = ticketId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${pickedDoc.fileName} uploaded successfully!')),
        );
      }
    } catch (e) {
      setState(() => _errorMessage = 'Upload failed: $e');
    } finally {
      if (mounted) setState(() => _uploadingStates[docType] = false);
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_ticketIds['DRIVING_LICENSE'] == null || _ticketIds['VEHICLE_RC'] == null) {
      setState(() => _errorMessage = 'Please upload at minimum Driving License and Vehicle RC.');
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
        'upiId': _upiController.text.trim(),
        'city': 'Chennai',
      });

      for (final service in _selectedServices) {
        await client.applyPartnerService(service);
      }

      for (final entry in _ticketIds.entries) {
        if (entry.value != null) {
          final docNum = entry.key == 'DRIVING_LICENSE'
              ? _dlNumberController.text.trim().toUpperCase()
              : (entry.key == 'VEHICLE_RC' ? _regNumberController.text.trim().toUpperCase() : null);
          await client.submitPartnerDocument(entry.key, entry.value!, documentNumber: docNum);
        }
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
                Text('Vehicle & Identity Registration', style: AllGoTypography.heading2),
                const SizedBox(height: 8),
                Text(
                  'Submit verified identity, vehicle RC, insurance, banking, and liveness selfie.',
                  style: AllGoTypography.subtitle,
                ),
                const SizedBox(height: 16),
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
                  const SizedBox(height: 14),
                ],
                PartnerVehicleDetailsSection(
                  selectedVehicle: _selectedVehicle,
                  onVehicleChanged: (v) => setState(() => _selectedVehicle = v),
                  regNumberController: _regNumberController,
                  makeModelController: _makeModelController,
                  dlNumberController: _dlNumberController,
                ),
                const SizedBox(height: 16),
                PartnerBankingAndUpiSection(
                  bankAccountController: _bankAccountController,
                  ifscController: _ifscController,
                  beneficiaryController: _beneficiaryController,
                  upiController: _upiController,
                ),
                const SizedBox(height: 18),
                PartnerServiceSelector(
                  selectedServices: _selectedServices,
                  onToggle: (key, isSelected) {
                    setState(() {
                      if (isSelected) _selectedServices.add(key);
                      else _selectedServices.remove(key);
                    });
                  },
                ),
                const SizedBox(height: 18),
                PartnerDocumentUploadGrid(
                  uploadedTicketIds: _ticketIds,
                  uploadingStates: _uploadingStates,
                  onUploadRequested: _handleUpload,
                ),
                const SizedBox(height: 22),
                AllGoButton(
                  label: 'Submit Onboarding Application',
                  isLoading: _isSubmitting,
                  onPressed: _handleSubmit,
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
