import 'package:flutter/material.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class PartnerEditProfileScreen extends ConsumerStatefulWidget {
  const PartnerEditProfileScreen({super.key});

  @override
  ConsumerState<PartnerEditProfileScreen> createState() => _PartnerEditProfileScreenState();
}

class _PartnerEditProfileScreenState extends ConsumerState<PartnerEditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _secondaryPhoneController;
  late final TextEditingController _emergencyNameController;
  late final TextEditingController _emergencyPhoneController;
  late final TextEditingController _addressController;

  bool _isSaving = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    final user = ref.read(currentUserProvider);
    _nameController = TextEditingController(text: user?.fullName ?? '');
    _secondaryPhoneController = TextEditingController();
    _emergencyNameController = TextEditingController();
    _emergencyPhoneController = TextEditingController();
    _addressController = TextEditingController();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _secondaryPhoneController.dispose();
    _emergencyNameController.dispose();
    _emergencyPhoneController.dispose();
    _addressController.dispose();
    super.dispose();
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
        'emergencyContactName': _emergencyNameController.text.trim(),
        'emergencyContactPhone': _emergencyPhoneController.text.trim(),
        'secondaryPhone': _secondaryPhoneController.text.trim(),
        'address': _addressController.text.trim(),
        'fullName': _nameController.text.trim(),
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile details updated successfully!'),
            backgroundColor: AllGoColors.success,
          ),
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      setState(() => _errorMessage = 'Failed to update profile: $e');
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      backgroundColor: AllGoColors.background,
      appBar: const AllGoAppBar(title: 'Edit Personal Profile'),
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
                AllGoTextField(
                  label: 'Full Name',
                  hint: 'Enter your full name',
                  controller: _nameController,
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Full name is required' : null,
                ),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AllGoColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AllGoColors.divider),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Registered Primary Phone', style: AllGoTypography.caption),
                          const SizedBox(height: 2),
                          Text(user?.phone ?? '+91 --', style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.bold)),
                        ],
                      ),
                      const Chip(
                        label: Text('Verified', style: TextStyle(color: AllGoColors.success, fontSize: 11)),
                        backgroundColor: AllGoColors.surface,
                        side: BorderSide(color: AllGoColors.success),
                        padding: EdgeInsets.zero,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                AllGoTextField(
                  label: 'Secondary / Alternate Phone',
                  hint: '+91 98765 43210',
                  controller: _secondaryPhoneController,
                  keyboardType: TextInputType.phone,
                ),
                const SizedBox(height: 14),
                AllGoTextField(
                  label: 'Emergency Contact Name',
                  hint: 'Spouse, parent, or trusted relative',
                  controller: _emergencyNameController,
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Emergency contact name is required' : null,
                ),
                const SizedBox(height: 14),
                AllGoTextField(
                  label: 'Emergency Contact Phone Number',
                  hint: '+91 91234 56789',
                  controller: _emergencyPhoneController,
                  keyboardType: TextInputType.phone,
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Emergency contact phone is required' : null,
                ),
                const SizedBox(height: 14),
                AllGoTextField(
                  label: 'Current Residential Address',
                  hint: 'Door no, Street, Area, City & PIN code',
                  controller: _addressController,
                  maxLines: 2,
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Residential address is required' : null,
                ),
                const SizedBox(height: 24),
                AllGoButton(
                  label: 'Save Profile Changes',
                  isLoading: _isSaving,
                  onPressed: _handleSave,
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
