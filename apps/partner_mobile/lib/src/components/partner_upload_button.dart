import 'package:flutter/material.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class PartnerUploadButton extends StatelessWidget {
  final String label;
  final String docType;
  final bool isUploaded;
  final bool isLoading;
  final void Function(String docType) onUpload;

  const PartnerUploadButton({
    super.key,
    required this.label,
    required this.docType,
    required this.isUploaded,
    required this.isLoading,
    required this.onUpload,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AllGoColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isUploaded ? AllGoColors.success : AllGoColors.divider),
      ),
      child: Row(
        children: [
          Icon(
            isUploaded ? Icons.check_circle : Icons.upload_file,
            color: isUploaded ? AllGoColors.success : AllGoColors.primary,
          ),
          const SizedBox(width: 12),
          Expanded(child: Text(label, style: AllGoTypography.bodyMedium)),
          if (isLoading)
            const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
          else
            TextButton(
              onPressed: () => onUpload(docType),
              child: Text(isUploaded ? 'Replace' : 'Upload'),
            ),
        ],
      ),
    );
  }
}
