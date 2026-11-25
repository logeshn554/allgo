import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class MerchantCsvImportScreen extends ConsumerStatefulWidget {
  final String outletId;

  const MerchantCsvImportScreen({super.key, required this.outletId});

  @override
  ConsumerState<MerchantCsvImportScreen> createState() => _MerchantCsvImportScreenState();
}

class _MerchantCsvImportScreenState extends ConsumerState<MerchantCsvImportScreen> {
  final _csvCtrl = TextEditingController(
    text: 'name,categoryName,basePriceInr,salePriceInr,isVeg,isPerishable,prepTimeMinutes,stockQuantity,description\n'
        'Paneer Butter Masala,Main Course,240,210,true,false,20,40,Creamy tomato gravy\n'
        'Organic Milk 1L,Dairy,78,,true,true,5,30,Fresh farm milk',
  );
  bool _uploading = false;
  Map<String, dynamic>? _result;

  @override
  void dispose() {
    _csvCtrl.dispose();
    super.dispose();
  }

  Future<void> _uploadCsv() async {
    final csv = _csvCtrl.text.trim();
    if (csv.isEmpty) return;
    setState(() {
      _uploading = true;
      _result = null;
    });
    try {
      final res = await ref.read(apiClientProvider).uploadBulkMenuCsv(widget.outletId, csv);
      if (mounted) {
        setState(() {
          _result = res;
          _uploading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _uploading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Import failed: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final errors = (_result?['errors'] as List<dynamic>?) ?? [];
    return Scaffold(
      appBar: AppBar(title: const Text('Bulk CSV Menu Import')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Paste CSV rows below (header + item rows) to bulk-import restaurant dishes or Quick Mart SKUs.',
            style: AllGoTypography.caption,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _csvCtrl,
            maxLines: 10,
            style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              labelText: 'CSV Payload',
            ),
          ),
          const SizedBox(height: 16),
          AllGoButton(
            label: 'Validate & Import CSV',
            icon: Icons.upload_file,
            isLoading: _uploading,
            onPressed: _uploadCsv,
          ),
          if (_result != null) ...[
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Imported ${_result!['insertedCount'] ?? 0} of ${_result!['totalRows'] ?? 0} rows (${_result!['validRows'] ?? 0} valid)',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    if (errors.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      ...errors.map((e) => Text(
                            'Row ${e['rowNumber']}: ${e['reason']}',
                            style: const TextStyle(color: AllGoColors.error, fontSize: 12),
                          )),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
