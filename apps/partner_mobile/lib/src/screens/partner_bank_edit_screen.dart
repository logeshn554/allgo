import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import '../components/partner_upload_button.dart';

class PartnerBankEditScreen extends ConsumerStatefulWidget {
  final String? initialAccountMasked;
  final String? initialIfsc;
  final String? initialHolderName;
  final bool isVerified;

  const PartnerBankEditScreen({
    super.key,
    this.initialAccountMasked,
    this.initialIfsc,
    this.initialHolderName,
    this.isVerified = false,
  });

  @override
  ConsumerState<PartnerBankEditScreen> createState() => _PartnerBankEditScreenState();
}

class _PartnerBankEditScreenState extends ConsumerState<PartnerBankEditScreen> {
  final _formKey = GlobalKey<FormState>();
  final ImagePicker _picker = ImagePicker();
  late final TextEditingController _accountController;
  late final TextEditingController _confirmAccountController;
  late final TextEditingController _ifscController;
  late final TextEditingController _holderController;
  bool _isUploadingProof = false;
  bool _proofUploaded = false;
  bool _isSaving = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _accountController = TextEditingController();
    _confirmAccountController = TextEditingController();
    _ifscController = TextEditingController(text: widget.initialIfsc ?? '');
    _holderController = TextEditingController(text: widget.initialHolderName ?? '');
  }

  @override
  void dispose() {
    _accountController.dispose();
    _confirmAccountController.dispose();
    _ifscController.dispose();
    _holderController.dispose();
    super.dispose();
  }

  Future<void> _handleUploadProof(String docType) async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Capture Passbook / Cheque'),
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
      _isUploadingProof = true;
      _errorMessage = null;
    });
    try {
      final XFile? file = await _picker.pickImage(source: source, imageQuality: 80, maxWidth: 1800);
      if (file == null) {
        setState(() => _errorMessage = 'Proof upload cancelled.');
        return;
      }
      final bytes = await file.readAsBytes();
      if (bytes.isEmpty) throw Exception('Selected file is empty');

      final client = ref.read(apiClientProvider);
      final ticket = await client.createUploadTicket(docType, 'image/jpeg', bytes.lengthInBytes);
      final ticketId = ticket['ticketId']?.toString() ?? ticket['id']?.toString() ?? '';
      await client.uploadDocumentBinary(ticketId, bytes);
      await client.submitPartnerDocument(docType, ticketId);
      setState(() => _proofUploaded = true);
    } catch (e) {
      setState(() => _errorMessage = 'Proof upload failed: $e');
    } finally {
      if (mounted) setState(() => _isUploadingProof = false);
    }
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;
    final acc = _accountController.text.trim();
    if (acc.isEmpty || acc.length < 6) {
      setState(() => _errorMessage = 'Please enter a valid bank account number');
      return;
    }
    if (acc != _confirmAccountController.text.trim()) {
      setState(() => _errorMessage = 'Bank account numbers do not match');
      return;
    }

    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });
    try {
      final client = ref.read(apiClientProvider);
      await client.registerPartner({
        'bankAccountNumber': acc,
        'bankIfsc': _ifscController.text.trim().toUpperCase(),
        'bankBeneficiaryName': _holderController.text.trim(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Bank details submitted for settlement verification!'),
            backgroundColor: AllGoColors.success,
          ),
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      setState(() => _errorMessage = 'Failed to update bank details: $e');
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final verified = widget.isVerified;
    return Scaffold(
      backgroundColor: AllGoColors.background,
      appBar: const AllGoAppBar(title: 'Bank Account & Payouts'),
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
                  const SizedBox(height: 14),
                ],
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: (verified ? AllGoColors.success : AllGoColors.warning).withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: verified ? AllGoColors.success : AllGoColors.warning),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        verified ? Icons.verified : Icons.pending_outlined,
                        color: verified ? AllGoColors.success : AllGoColors.warning,
                        size: 24,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          verified
                              ? 'Bank Account Verified for Settlements'
                              : 'Submit bank details & cancelled cheque for verification',
                          style: AllGoTypography.caption.copyWith(fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                AllGoTextField(
                  label: 'Account Holder Name',
                  hint: 'Name as registered in bank',
                  controller: _holderController,
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 12),
                AllGoTextField(
                  label: 'Bank IFSC Code',
                  hint: '11-character IFSC code',
                  controller: _ifscController,
                  validator: (v) => (v == null || v.trim().length < 8) ? 'Enter valid IFSC' : null,
                ),
                const SizedBox(height: 12),
                AllGoTextField(
                  label: 'New Bank Account Number',
                  hint: widget.initialAccountMasked ?? 'Enter bank account number',
                  controller: _accountController,
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 12),
                AllGoTextField(
                  label: 'Confirm New Bank Account Number',
                  hint: 'Re-enter bank account number',
                  controller: _confirmAccountController,
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 16),
                PartnerUploadButton(
                  label: 'Bank Passbook / Cheque Proof',
                  docType: 'BANK_PROOF',
                  isUploaded: _proofUploaded,
                  isLoading: _isUploadingProof,
                  onUpload: _handleUploadProof,
                ),
                const SizedBox(height: 20),
                AllGoButton(label: 'Save & Update Bank Account', isLoading: _isSaving, onPressed: _handleSave),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
