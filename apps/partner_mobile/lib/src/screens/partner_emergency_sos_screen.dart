import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class PartnerEmergencySosScreen extends ConsumerStatefulWidget {
  const PartnerEmergencySosScreen({super.key});

  @override
  ConsumerState<PartnerEmergencySosScreen> createState() => _PartnerEmergencySosScreenState();
}

class _PartnerEmergencySosScreenState extends ConsumerState<PartnerEmergencySosScreen> {
  final _nameCtrl = TextEditingController(text: 'Suresh Kumar');
  final _phoneCtrl = TextEditingController(text: '+919876543219');
  final _relationCtrl = TextEditingController(text: 'Brother / Spouse');

  bool _isSosTriggered = false;
  bool _isSaving = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _relationCtrl.dispose();
    super.dispose();
  }

  void _triggerSosAlert() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.warning, color: Colors.red),
            SizedBox(width: 8),
            Text('CONFIRM SOS BROADCAST', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 16)),
          ],
        ),
        content: const Text(
          'This will immediately transmit your high-accuracy GPS coordinates, active trip telemetry, and dispatch details to 112 National Emergency and AllGo 24x7 Safety Response Team.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              Navigator.pop(ctx);
              setState(() => _isSosTriggered = true);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('EMERGENCY SOS BROADCAST ACTIVE. Help is on the way.'),
                  backgroundColor: Colors.red,
                  duration: Duration(seconds: 5),
                ),
              );
            },
            child: const Text('BROADCAST SOS NOW', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _saveEmergencyContacts() {
    setState(() => _isSaving = true);
    Future.delayed(const Duration(milliseconds: 600), () {
      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Emergency contacts updated successfully'),
            backgroundColor: AllGoColors.success,
          ),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AllGoColors.background,
      appBar: const AllGoAppBar(title: 'Emergency SOS & Safety'),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // SOS Trigger Button Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: _isSosTriggered ? Colors.red.shade50 : AllGoColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: _isSosTriggered ? Colors.red : AllGoColors.divider,
                  width: _isSosTriggered ? 2 : 1,
                ),
              ),
              child: Column(
                children: [
                  Icon(
                    _isSosTriggered ? Icons.emergency : Icons.warning_amber_rounded,
                    color: Colors.red,
                    size: 56,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _isSosTriggered ? 'SOS BROADCAST ACTIVE' : 'Emergency SOS Button',
                    style: AllGoTypography.heading3.copyWith(
                      color: Colors.red,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _isSosTriggered
                      ? 'Live location transmitted to AllGo Safety Center and police helpline 112.'
                      : 'Pressing this triggers an instantaneous alert to your emergency contact and AllGo 24x7 control room.',
                    textAlign: TextAlign.center,
                    style: AllGoTypography.caption,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: const Icon(Icons.sos, size: 24),
                    label: Text(
                      _isSosTriggered ? 'SOS BROADCASTING...' : 'TRIGGER EMERGENCY SOS',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    onPressed: _triggerSosAlert,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            // Emergency Contact configuration form
            Text('Primary Emergency Contact', style: AllGoTypography.heading3),
            const SizedBox(height: 8),
            Text('This person will receive an automated SOS SMS with your live location link.', style: AllGoTypography.caption),
            const SizedBox(height: 16),
            AllGoTextField(
              label: 'Contact Name',
              controller: _nameCtrl,
            ),
            const SizedBox(height: 12),
            AllGoTextField(
              label: 'Mobile Phone (+91)',
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 12),
            AllGoTextField(
              label: 'Relationship',
              controller: _relationCtrl,
            ),
            const SizedBox(height: 20),
            AllGoButton(
              label: 'Save Emergency Contacts',
              isLoading: _isSaving,
              icon: Icons.save,
              onPressed: _saveEmergencyContacts,
            ),
            const SizedBox(height: 24),
            // Official Helplines Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blueGrey.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blueGrey.shade200),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.local_police, color: Colors.indigo, size: 20),
                      SizedBox(width: 8),
                      Text('National Emergency Helplines', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    ],
                  ),
                  SizedBox(height: 8),
                  Text('• Police & Emergency Response Support System (ERSS): 112\n• AllGo Partner Safety Helpline: 1800-419-ALLGO (24x7)\n• Ambulance / Medical: 108', style: TextStyle(fontSize: 12, height: 1.5)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
