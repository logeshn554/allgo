import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class StoreBrandingMediaScreen extends ConsumerStatefulWidget {
  final String outletId;
  final String outletName;
  final String? initialLogoUrl;
  final String? initialCoverUrl;

  const StoreBrandingMediaScreen({
    super.key,
    required this.outletId,
    required this.outletName,
    this.initialLogoUrl,
    this.initialCoverUrl,
  });

  @override
  ConsumerState<StoreBrandingMediaScreen> createState() => _StoreBrandingMediaScreenState();
}

class _StoreBrandingMediaScreenState extends ConsumerState<StoreBrandingMediaScreen> {
  final ImagePicker _picker = ImagePicker();
  late final TextEditingController _logoUrlCtrl;
  late final TextEditingController _coverUrlCtrl;

  Uint8List? _logoPreviewBytes;
  Uint8List? _coverPreviewBytes;
  bool _isUploadingLogo = false;
  bool _isUploadingCover = false;
  bool _isSaving = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _logoUrlCtrl = TextEditingController(text: widget.initialLogoUrl ?? '');
    _coverUrlCtrl = TextEditingController(text: widget.initialCoverUrl ?? '');
  }

  @override
  void dispose() {
    _logoUrlCtrl.dispose();
    _coverUrlCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickAndUploadImage({required bool isLogo}) async {
    setState(() {
      if (isLogo) {
        _isUploadingLogo = true;
      } else {
        _isUploadingCover = true;
      }
      _errorMessage = null;
    });

    try {
      final XFile? file = await _picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 80,
        maxWidth: isLogo ? 600 : 1600,
      );
      if (file == null) {
        setState(() {
          _isUploadingLogo = false;
          _isUploadingCover = false;
        });
        return;
      }
      final bytes = await file.readAsBytes();
      if (bytes.isEmpty) throw Exception('Selected image is empty');

      final client = ref.read(apiClientProvider);
      final ticket = await client.createUploadTicket(
        isLogo ? 'OUTLET_LOGO' : 'OUTLET_COVER',
        'image/jpeg',
        bytes.lengthInBytes,
      );
      final ticketId = ticket['ticketId']?.toString() ?? ticket['id']?.toString() ?? '';
      final storageKey = ticket['storageKey']?.toString() ?? ticket['storage_key']?.toString() ?? '';
      final publicUrl = ticket['publicUrl']?.toString() ?? ticket['url']?.toString() ?? storageKey;
      await client.uploadDocumentBinary(ticketId, bytes);

      if (!mounted) return;
      setState(() {
        if (isLogo) {
          _logoPreviewBytes = bytes;
          if (publicUrl.isNotEmpty) _logoUrlCtrl.text = publicUrl;
        } else {
          _coverPreviewBytes = bytes;
          if (publicUrl.isNotEmpty) _coverUrlCtrl.text = publicUrl;
        }
      });
    } catch (e) {
      if (mounted) setState(() => _errorMessage = 'Image upload failed: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isUploadingLogo = false;
          _isUploadingCover = false;
        });
      }
    }
  }

  Future<void> _handleSave() async {
    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    try {
      final client = ref.read(apiClientProvider);
      await client.updateOutletStatus(
        widget.outletId,
        null,
        logoUrl: _logoUrlCtrl.text.trim().isEmpty ? null : _logoUrlCtrl.text.trim(),
        coverPhotoUrl: _coverUrlCtrl.text.trim().isEmpty ? null : _coverUrlCtrl.text.trim(),
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Store logo and cover photo saved successfully!'),
            backgroundColor: AllGoColors.success,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isSaving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final coverHasNetwork = _coverUrlCtrl.text.trim().startsWith('http');
    final logoHasNetwork = _logoUrlCtrl.text.trim().startsWith('http');

    return Scaffold(
      backgroundColor: AllGoColors.background,
      appBar: const AllGoAppBar(title: 'Store Logo & Cover Photo'),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            if (_errorMessage != null)
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Text('Error: $_errorMessage', style: const TextStyle(color: Colors.red)),
              ),
            Text('Storefront Preview', style: AllGoTypography.heading3),
            const SizedBox(height: 8),
            Container(
              height: 160,
              decoration: BoxDecoration(
                color: AllGoColors.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(16),
                image: _coverPreviewBytes != null
                    ? DecorationImage(image: MemoryImage(_coverPreviewBytes!), fit: BoxFit.cover)
                    : coverHasNetwork
                        ? DecorationImage(image: NetworkImage(_coverUrlCtrl.text.trim()), fit: BoxFit.cover)
                        : null,
              ),
              child: Stack(
                children: [
                  Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      gradient: LinearGradient(
                        colors: [Colors.black.withValues(alpha: 0.65), Colors.transparent],
                        begin: Alignment.bottomCenter,
                        end: Alignment.topCenter,
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 16,
                    left: 16,
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 28,
                          backgroundColor: Colors.white,
                          backgroundImage: _logoPreviewBytes != null
                              ? MemoryImage(_logoPreviewBytes!)
                              : logoHasNetwork
                                  ? NetworkImage(_logoUrlCtrl.text.trim()) as ImageProvider
                                  : null,
                          child: (_logoPreviewBytes == null && !logoHasNetwork)
                              ? const Icon(Icons.storefront, color: AllGoColors.primary)
                              : null,
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.outletName,
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                            const Text('Verified Merchant Outlet', style: TextStyle(color: Colors.white70, fontSize: 12)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _isUploadingLogo ? null : () => _pickAndUploadImage(isLogo: true),
                    icon: _isUploadingLogo
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.upload_outlined),
                    label: const Text('Upload Logo'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _isUploadingCover ? null : () => _pickAndUploadImage(isLogo: false),
                    icon: _isUploadingCover
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.photo_size_select_actual_outlined),
                    label: const Text('Upload Cover'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            AllGoTextField(
              label: 'Logo Asset Key / URL',
              hint: 'Uploaded key or https://...',
              controller: _logoUrlCtrl,
            ),
            const SizedBox(height: 12),
            AllGoTextField(
              label: 'Cover Asset Key / URL',
              hint: 'Uploaded key or https://...',
              controller: _coverUrlCtrl,
            ),
            const SizedBox(height: 24),
            AllGoButton(
              label: 'Save Branding Media',
              isLoading: _isSaving,
              onPressed: _handleSave,
            ),
          ],
        ),
      ),
    );
  }
}
