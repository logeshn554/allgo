import 'package:flutter/material.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class MerchantRegistrationScreen extends StatefulWidget {
  const MerchantRegistrationScreen({super.key});

  @override
  State<MerchantRegistrationScreen> createState() => _MerchantRegistrationScreenState();
}

class _MerchantRegistrationScreenState extends State<MerchantRegistrationScreen> {
  String _selectedMerchantType = 'RESTAURANT';
  final _outletNameController = TextEditingController();
  final _fssaiController = TextEditingController();
  final _gstinController = TextEditingController();
  final _panController = TextEditingController();
  final _bankAccountController = TextEditingController();
  final _ifscController = TextEditingController();

  @override
  void dispose() {
    _outletNameController.dispose();
    _fssaiController.dispose();
    _gstinController.dispose();
    _panController.dispose();
    _bankAccountController.dispose();
    _ifscController.dispose();
    super.dispose();
  }

  void _handleSubmit() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Outlet details submitted. Verification in progress.'),
        backgroundColor: AllGoColors.success,
      ),
    );
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AllGoColors.background,
      appBar: const AllGoAppBar(title: 'Outlet Registration'),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Outlet & Business Details', style: AllGoTypography.heading2),
              const SizedBox(height: 8),
              Text(
                'Provide official compliance documentation for your merchant account.',
                style: AllGoTypography.subtitle,
              ),
              const SizedBox(height: 24),

              AllGoTextField(
                label: 'Outlet Commercial Name',
                hint: 'Anjappar Chettinad Restaurant',
                controller: _outletNameController,
              ),
              const SizedBox(height: 16),

              Text('Merchant Category', style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.bold)),
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
                    value: _selectedMerchantType,
                    isExpanded: true,
                    items: const [
                      DropdownMenuItem(value: 'RESTAURANT', child: Text('Restaurant (Food Delivery)')),
                      DropdownMenuItem(value: 'CLOUD_KITCHEN', child: Text('Cloud Kitchen / Virtual Brand')),
                      DropdownMenuItem(value: 'GROCERY_STORE', child: Text('Grocery Retail Store')),
                      DropdownMenuItem(value: 'DARK_STORE', child: Text('Dark Store (15-min Quick Commerce)')),
                      DropdownMenuItem(value: 'HOME_SELLER', child: Text('Home Food Seller')),
                    ],
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedMerchantType = val);
                    },
                  ),
                ),
              ),
              const SizedBox(height: 16),

              AllGoTextField(
                label: '14-Digit FSSAI License Number',
                hint: '12423001000123',
                controller: _fssaiController,
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 16),

              AllGoTextField(
                label: 'GSTIN Number (Optional for Home Sellers)',
                hint: '33AABCA1234A1Z5',
                controller: _gstinController,
              ),
              const SizedBox(height: 16),

              AllGoTextField(
                label: 'Business PAN Number',
                hint: 'AABCA1234A',
                controller: _panController,
              ),
              const SizedBox(height: 24),

              Text('Bank Settlement Account', style: AllGoTypography.heading3),
              const SizedBox(height: 12),

              AllGoTextField(
                label: 'Account Number',
                hint: '50100234567890',
                controller: _bankAccountController,
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 16),

              AllGoTextField(
                label: 'IFSC Code',
                hint: 'HDFC0001234',
                controller: _ifscController,
              ),
              const SizedBox(height: 32),

              AllGoButton(
                label: 'Submit for Review',
                onPressed: _handleSubmit,
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
