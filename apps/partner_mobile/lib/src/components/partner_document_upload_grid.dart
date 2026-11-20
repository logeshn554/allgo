import 'package:flutter/material.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import 'partner_upload_button.dart';

class PartnerDocumentUploadGrid extends StatelessWidget {
  final Map<String, String?> uploadedTicketIds;
  final Map<String, bool> uploadingStates;
  final void Function(String docType) onUploadRequested;

  const PartnerDocumentUploadGrid({
    super.key,
    required this.uploadedTicketIds,
    required this.uploadingStates,
    required this.onUploadRequested,
  });

  @override
  Widget build(BuildContext context) {
    final docs = [
      {'key': 'AADHAAR', 'label': 'Aadhaar / National ID Card'},
      {'key': 'DRIVING_LICENSE', 'label': 'Driving License (DL)'},
      {'key': 'VEHICLE_RC', 'label': 'Vehicle Registration (RC)'},
      {'key': 'VEHICLE_INSURANCE', 'label': 'Vehicle Insurance Policy'},
      {'key': 'SELFIE', 'label': 'Live Facial Selfie (Liveness)'},
      {'key': 'BANK_PASSBOOK', 'label': 'Bank Passbook / Cheque'},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Regulatory Documents & KYC Proofs',
          style: AllGoTypography.heading3.copyWith(fontSize: 15),
        ),
        const SizedBox(height: 10),
        ...docs.map((doc) {
          final key = doc['key']!;
          final label = doc['label']!;
          return Padding(
            padding: const EdgeInsets.only(bottom: 10.0),
            child: PartnerUploadButton(
              label: label,
              docType: key,
              isUploaded: uploadedTicketIds[key] != null,
              isLoading: uploadingStates[key] == true,
              onUpload: onUploadRequested,
            ),
          );
        }),
      ],
    );
  }
}
