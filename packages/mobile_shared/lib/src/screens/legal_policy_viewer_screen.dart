import 'package:flutter/material.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class LegalPolicyViewerScreen extends StatelessWidget {
  final String title;
  final String markdownContent;

  const LegalPolicyViewerScreen({
    super.key,
    required this.title,
    required this.markdownContent,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AllGoColors.background,
      appBar: AllGoAppBar(title: title),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AllGoColors.surface,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AllGoColors.divider),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.verified_user, color: AllGoColors.primary, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Governed under India DPDP Act 2023 & Consumer Protection Rules',
                        style: AllGoTypography.caption.copyWith(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Text(
                markdownContent,
                style: AllGoTypography.bodyMedium.copyWith(height: 1.6),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
