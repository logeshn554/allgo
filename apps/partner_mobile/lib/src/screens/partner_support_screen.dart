import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class PartnerSupportScreen extends ConsumerStatefulWidget {
  const PartnerSupportScreen({super.key});

  @override
  ConsumerState<PartnerSupportScreen> createState() => _PartnerSupportScreenState();
}

class _PartnerSupportScreenState extends ConsumerState<PartnerSupportScreen> {
  final ApiClient _apiClient = ApiClient();
  bool _isLoading = true;
  List<dynamic> _tickets = [];

  @override
  void initState() {
    super.initState();
    _loadTickets();
  }

  Future<void> _loadTickets() async {
    setState(() => _isLoading = true);
    try {
      final data = await _apiClient.getUserSupportTickets(role: 'PARTNER');
      if (mounted) setState(() { _tickets = data; _isLoading = false; });
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _createTicketDialog() async {
    final subCtrl = TextEditingController();
    final descCtrl = TextEditingController();

    final created = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Partner Support Ticket'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: subCtrl, decoration: const InputDecoration(labelText: 'Issue Subject')),
            const SizedBox(height: 12),
            TextField(controller: descCtrl, maxLines: 3, decoration: const InputDecoration(labelText: 'Description')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Submit'),
          ),
        ],
      ),
    );

    if (created == true && mounted) {
      await _apiClient.createSupportTicket({
        'category': 'PARTNER_DISPUTE',
        'subject': subCtrl.text.trim(),
        'description': descCtrl.text.trim(),
      }, role: 'PARTNER');
      _loadTickets();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AllGoColors.background,
      appBar: const AllGoAppBar(title: 'Partner Support', showBackButton: true),
      floatingActionButton: FloatingActionButton(
        onPressed: _createTicketDialog,
        backgroundColor: AllGoColors.secondary,
        child: const Icon(Icons.add, color: Colors.white),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _tickets.isEmpty
              ? const Center(child: Text('No support tickets opened.'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _tickets.length,
                  itemBuilder: (ctx, idx) {
                    final t = _tickets[idx];
                    return Card(
                      child: ListTile(
                        title: Text(t['subject']?.toString() ?? 'Ticket', style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('Status: ${t['status']}'),
                      ),
                    );
                  },
                ),
    );
  }
}
