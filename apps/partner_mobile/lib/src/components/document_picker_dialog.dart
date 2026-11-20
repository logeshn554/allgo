import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class PickedDocument {
  final String fileName;
  final String mimeType;
  final Uint8List bytes;
  final int sizeBytes;

  const PickedDocument({
    required this.fileName,
    required this.mimeType,
    required this.bytes,
    required this.sizeBytes,
  });
}

class DocumentPickerDialog extends StatefulWidget {
  final String title;
  final String documentType;

  const DocumentPickerDialog({
    super.key,
    required this.title,
    required this.documentType,
  });

  @override
  State<DocumentPickerDialog> createState() => _DocumentPickerDialogState();
}

class _DocumentPickerDialogState extends State<DocumentPickerDialog> {
  final TextEditingController _documentIdentifierCtrl = TextEditingController();
  final TextEditingController _documentNotesCtrl = TextEditingController();
  String _selectedFormat = 'application/pdf';
  String _sampleFileName = 'doc_scanned.pdf';
  bool _isSelfie = false;

  @override
  void initState() {
    super.initState();
    _isSelfie = widget.documentType == 'SELFIE';
    if (_isSelfie) {
      _selectedFormat = 'image/jpeg';
      _sampleFileName = 'selfie_capture.jpg';
      _documentIdentifierCtrl.text = 'SELFIE_LIVENESS_READY';
    } else {
      _sampleFileName = '${widget.documentType.toLowerCase()}_scan.pdf';
      _documentIdentifierCtrl.text = 'DOC-${widget.documentType.substring(0, 3)}-9921';
    }
  }

  @override
  void dispose() {
    _documentIdentifierCtrl.dispose();
    _documentNotesCtrl.dispose();
    super.dispose();
  }

  void _onFormatChanged(String format) {
    setState(() {
      _selectedFormat = format;
      final ext = format == 'application/pdf' ? 'pdf' : (format == 'image/jpeg' ? 'jpg' : 'png');
      _sampleFileName = '${widget.documentType.toLowerCase()}_document.$ext';
    });
  }

  PickedDocument _producePickedDocument() {
    final identifier = _documentIdentifierCtrl.text.trim();
    final notes = _documentNotesCtrl.text.trim();
    final metaText = 'ALLGO_GOVERNMENT_KYC\nTYPE:${widget.documentType}\nID:$identifier\nNOTES:$notes\nTS:${DateTime.now().toIso8601String()}';
    final payloadBytes = utf8.encode(metaText);

    Uint8List fullBytes;
    if (_selectedFormat == 'application/pdf') {
      final header = [0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A];
      final body = List<int>.filled(64, 0x20);
      final eof = [0x0A, 0x25, 0x25, 0x45, 0x4F, 0x46];
      fullBytes = Uint8List.fromList([...header, ...payloadBytes, ...body, ...eof]);
    } else if (_selectedFormat == 'image/jpeg') {
      final header = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46];
      final body = List<int>.filled(32, 0x00);
      final eof = [0xFF, 0xD9];
      fullBytes = Uint8List.fromList([...header, ...payloadBytes, ...body, ...eof]);
    } else {
      final header = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
      final iend = [0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82];
      fullBytes = Uint8List.fromList([...header, ...payloadBytes, ...iend]);
    }

    return PickedDocument(
      fileName: _sampleFileName,
      mimeType: _selectedFormat,
      bytes: fullBytes,
      sizeBytes: fullBytes.lengthInBytes,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 480),
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(_isSelfie ? Icons.camera_alt : Icons.badge, color: AllGoColors.primary),
                    const SizedBox(width: 8),
                    Text(widget.title, style: AllGoTypography.heading3.copyWith(fontSize: 16)),
                  ],
                ),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
              ],
            ),
            const Divider(),
            if (!_isSelfie) ...[
              const SizedBox(height: 8),
              Text('Document Format', style: AllGoTypography.caption.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              Row(
                children: [
                  ChoiceChip(
                    label: const Text('PDF'),
                    selected: _selectedFormat == 'application/pdf',
                    onSelected: (_) => _onFormatChanged('application/pdf'),
                  ),
                  const SizedBox(width: 8),
                  ChoiceChip(
                    label: const Text('JPEG'),
                    selected: _selectedFormat == 'image/jpeg',
                    onSelected: (_) => _onFormatChanged('image/jpeg'),
                  ),
                  const SizedBox(width: 8),
                  ChoiceChip(
                    label: const Text('PNG'),
                    selected: _selectedFormat == 'image/png',
                    onSelected: (_) => _onFormatChanged('image/png'),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 12),
            AllGoTextField(
              label: _isSelfie ? 'Liveness Face Capture Session' : 'Document Number / Serial',
              hint: _isSelfie ? 'Selfie capture status' : 'Enter official card number',
              controller: _documentIdentifierCtrl,
            ),
            const SizedBox(height: 10),
            AllGoTextField(
              label: 'Additional Notes / Issuing Authority',
              hint: 'Optional notes for admin verification team',
              controller: _documentNotesCtrl,
            ),
            const SizedBox(height: 16),
            AllGoButton(
              label: _isSelfie ? 'Capture & Upload Selfie' : 'Upload Selected Document',
              icon: _isSelfie ? Icons.camera : Icons.cloud_upload_outlined,
              onPressed: () {
                final doc = _producePickedDocument();
                Navigator.pop(context, doc);
              },
            ),
          ],
        ),
      ),
    );
  }
}
