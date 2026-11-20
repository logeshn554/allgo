import 'package:flutter/material.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class PartnerBankingAndUpiSection extends StatelessWidget {
  final TextEditingController bankAccountController;
  final TextEditingController ifscController;
  final TextEditingController beneficiaryController;
  final TextEditingController upiController;

  const PartnerBankingAndUpiSection({
    super.key,
    required this.bankAccountController,
    required this.ifscController,
    required this.beneficiaryController,
    required this.upiController,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Banking & Payout Channels', style: AllGoTypography.heading3.copyWith(fontSize: 15)),
        const SizedBox(height: 10),
        AllGoTextField(
          label: 'Bank Account Number',
          hint: '9-18 digit savings/current account',
          controller: bankAccountController,
          validator: (v) => (v == null || v.trim().isEmpty) ? 'Bank account is required' : null,
        ),
        const SizedBox(height: 10),
        AllGoTextField(
          label: 'Bank IFSC Code',
          hint: 'e.g. SBIN0001234 / HDFC0001234',
          controller: ifscController,
          validator: (v) => (v == null || v.trim().isEmpty) ? 'IFSC code is required' : null,
        ),
        const SizedBox(height: 10),
        AllGoTextField(
          label: 'Beneficiary Account Name',
          hint: 'Name as registered on bank passbook',
          controller: beneficiaryController,
          validator: (v) => (v == null || v.trim().isEmpty) ? 'Beneficiary name is required' : null,
        ),
        const SizedBox(height: 10),
        AllGoTextField(
          label: 'Instant Payout UPI ID (VPA)',
          hint: 'e.g. partner@okaxis / driver@paytm',
          controller: upiController,
          validator: (v) {
            if (v == null || v.trim().isEmpty) return 'UPI ID is required';
            if (!v.contains('@')) return 'Enter a valid UPI ID (e.g. name@bank)';
            return null;
          },
        ),
      ],
    );
  }
}
