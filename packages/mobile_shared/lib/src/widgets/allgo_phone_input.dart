import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';

class AllGoPhoneInput extends StatelessWidget {
  final TextEditingController controller;
  final String? Function(String?)? validator;
  final void Function(String)? onChanged;
  final bool enabled;

  const AllGoPhoneInput({
    super.key,
    required this.controller,
    this.validator,
    this.onChanged,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Mobile Number',
          style: AllGoTypography.bodyMedium.copyWith(
            fontWeight: FontWeight.w600,
            color: AllGoColors.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          enabled: enabled,
          keyboardType: TextInputType.phone,
          maxLength: 10,
          style: AllGoTypography.bodyLarge.copyWith(letterSpacing: 1.2),
          decoration: InputDecoration(
            counterText: '',
            hintText: '98765 43210',
            prefixIcon: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('🇮🇳', style: TextStyle(fontSize: 18)),
                  const SizedBox(width: 8),
                  Text(
                    '+91',
                    style: AllGoTypography.bodyLarge.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AllGoColors.textPrimary,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Container(height: 24, width: 1, color: AllGoColors.divider),
                  const SizedBox(width: 8),
                ],
              ),
            ),
          ),
          validator: validator ??
              (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Please enter your mobile number';
                }
                final clean = value.replaceAll(RegExp(r'\D'), '');
                if (clean.length != 10) {
                  return 'Enter a valid 10-digit mobile number';
                }
                if (!RegExp(r'^[6-9]').hasMatch(clean)) {
                  return 'Indian numbers must start with 6, 7, 8, or 9';
                }
                return null;
              },
          onChanged: (val) {
            if (onChanged != null) {
              onChanged!(val);
            }
          },
        ),
      ],
    );
  }
}
