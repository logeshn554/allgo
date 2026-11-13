import 'package:flutter/material.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class PartnerDocumentsUploadSection extends StatelessWidget {
  final TextEditingController dlNumberController;
  final bool isUploadingDl;
  final bool isUploadingRc;
  final String? dlTicketId;
  final String? rcTicketId;
  final Future<void> Function(String docType) onUpload;

  const PartnerDocumentsUploadSection({
    super.key,
    required this.dlNumberController,
    required this.isUploadingDl,
    required this.isUploadingRc,
    required this.dlTicketId,
    required this.rcTicketId,
    required this.onUpload,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AllGoTextField(
          label: 'Driving License Number',
          hint: 'DL-1420110012345',
          controller: dlNumberController,
          validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
        ),
        const SizedBox(height: 16),
        Text('Compliance Documents', style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: ElevatedButton.icon(
                onPressed: isUploadingDl ? null : () => onUpload('DRIVING_LICENSE'),
                icon: Icon(dlTicketId != null ? Icons.check_circle : Icons.upload_file),
                label: Text(dlTicketId != null ? 'DL Attached' : 'Upload DL'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: dlTicketId != null ? Colors.green : AllGoColors.surface,
                  foregroundColor: dlTicketId != null ? Colors.white : AllGoColors.textPrimary,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: ElevatedButton.icon(
                onPressed: isUploadingRc ? null : () => onUpload('VEHICLE_RC'),
                icon: Icon(rcTicketId != null ? Icons.check_circle : Icons.upload_file),
                label: Text(rcTicketId != null ? 'RC Attached' : 'Upload RC'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: rcTicketId != null ? Colors.green : AllGoColors.surface,
                  foregroundColor: rcTicketId != null ? Colors.white : AllGoColors.textPrimary,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
