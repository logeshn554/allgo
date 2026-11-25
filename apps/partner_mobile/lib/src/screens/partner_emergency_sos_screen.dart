import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class PartnerEmergencySosScreen extends ConsumerStatefulWidget {
  const PartnerEmergencySosScreen({super.key});

  @override
  ConsumerState<PartnerEmergencySosScreen> createState() => _PartnerEmergencySosScreenState();
}

class _PartnerEmergencySosScreenState extends ConsumerState<PartnerEmergencySosScreen> {
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _relationCtrl = TextEditingController();

  bool _isSosTriggered = false;
  bool _isBroadcasting = false;
  bool _isSaving = false;
  String? _incidentId;
  double? _lastLat;
  double? _lastLng;

  @override
  void initState() {
    super.initState();
    _loadSavedContact();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _relationCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadSavedContact() async {
    try {
      final profile = await ref.read(apiClientProvider).getPartnerProfile();
      final partner = profile['partner'] as Map<String, dynamic>? ?? profile;
      if (!mounted) return;
      setState(() {
        _nameCtrl.text = (partner['emergencyContactName'] ?? partner['emergency_contact_name'] ?? '').toString();
        _phoneCtrl.text = (partner['emergencyContactPhone'] ?? partner['emergency_contact_phone'] ?? '').toString();
        _relationCtrl.text = (partner['emergencyContactRelation'] ?? partner['emergency_contact_relation'] ?? '').toString();
      });
    } catch (_) {
      // Leave empty if not configured yet
    }
  }

  Future<void> _broadcastSos() async {
    setState(() => _isBroadcasting = true);
    try {
      double lat = 0.0;
      double lng = 0.0;
      try {
        final pos = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
          timeLimit: const Duration(seconds: 6),
        );
        lat = pos.latitude;
        lng = pos.longitude;
      } catch (_) {}

      final client = ref.read(apiClientProvider);
      final activeRide = await client.getPartnerActiveRide().catchError((_) => null);
      if (activeRide != null) {
        await client.triggerRideSos(
          activeRide.id,
          latitude: lat,
          longitude: lng,
          reason: 'Partner triggered Emergency SOS',
        );
      }

      final ticket = await client.createSupportTicket({
        'subject': 'EMERGENCY SOS ALERT — Partner Safety Dispatch',
        'category': 'SAFETY_SOS',
        'priority': 'CRITICAL',
        'description':
            'Partner triggered SOS at GPS ($lat, $lng). Emergency Contact: ${_nameCtrl.text.trim()} (${_phoneCtrl.text.trim()}).',
      }, role: 'PARTNER');

      if (!mounted) return;
      setState(() {
        _isSosTriggered = true;
        _isBroadcasting = false;
        _lastLat = lat;
        _lastLng = lng;
        _incidentId = ticket['id']?.toString() ?? ticket['ticketNumber']?.toString();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('EMERGENCY SOS BROADCAST SENT. Safety Response Team notified.'),
          backgroundColor: Colors.red,
          duration: Duration(seconds: 5),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _isBroadcasting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('SOS broadcast failed: $e'), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _dialNumber(String number) async {
    final uri = Uri(scheme: 'tel', path: number);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Unable to launch dialer for $number')),
      );
    }
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
          'This will immediately transmit your live GPS coordinates, active trip details, and a critical alert to the AllGo 24x7 Safety Response Team.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              Navigator.pop(ctx);
              _broadcastSos();
            },
            child: const Text('BROADCAST SOS NOW', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Future<void> _saveEmergencyContacts() async {
    final name = _nameCtrl.text.trim();
    final phone = _phoneCtrl.text.trim();
    final relation = _relationCtrl.text.trim();
    if (name.isEmpty || phone.length < 10) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a valid contact name and 10+ digit phone number.')),
      );
      return;
    }

    setState(() => _isSaving = true);
    try {
      await ref.read(apiClientProvider).registerPartner({
        'emergencyContactName': name,
        'emergencyContactPhone': phone,
        'emergencyContactRelation': relation,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Emergency contacts saved to your partner profile'),
            backgroundColor: AllGoColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save emergency contact: $e'), backgroundColor: AllGoColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
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
                    _isSosTriggered ? Icons.notifications_active : Icons.emergency,
                    color: Colors.red,
                    size: 48,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _isSosTriggered ? 'SOS SIGNAL ACTIVE' : '24x7 Safety Response',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.red),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _isSosTriggered
                        ? 'Incident ${_incidentId ?? 'logged'} transmitted at (${_lastLat?.toStringAsFixed(4) ?? '--'}, ${_lastLng?.toStringAsFixed(4) ?? '--'}).'
                        : 'Tap below only during a real road emergency, accident, or personal safety threat.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: _isBroadcasting ? null : _triggerSosAlert,
                      icon: _isBroadcasting
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Icon(Icons.sos, color: Colors.white),
                      label: Text(
                        _isBroadcasting
                            ? 'SENDING SOS TELEMETRY...'
                            : _isSosTriggered
                                ? 'RE-BROADCAST SOS'
                                : 'TRIGGER EMERGENCY SOS',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => _dialNumber('112'),
                          icon: const Icon(Icons.call, color: Colors.red, size: 18),
                          label: const Text('Call 112', style: TextStyle(color: Colors.red)),
                        ),
                      ),
                      if (_phoneCtrl.text.trim().isNotEmpty) ...[
                        const SizedBox(width: 8),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => _dialNumber(_phoneCtrl.text.trim()),
                            icon: const Icon(Icons.person_pin_circle, size: 18),
                            label: const Text('Call Contact'),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Text('Trusted Emergency Contact', style: AllGoTypography.heading3),
            const SizedBox(height: 4),
            Text(
              'Receives immediate escalation details if SOS is triggered.',
              style: AllGoTypography.caption,
            ),
            const SizedBox(height: 16),
            AllGoTextField(
              label: 'Contact Full Name',
              hint: 'Enter trusted contact name',
              controller: _nameCtrl,
            ),
            const SizedBox(height: 12),
            AllGoTextField(
              label: 'Contact Mobile Number',
              hint: 'e.g. +919876543210',
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 12),
            AllGoTextField(
              label: 'Relationship',
              hint: 'e.g. Spouse, Parent, Sibling',
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
                  Text(
                    '• Police & Emergency Response Support System (ERSS): 112\n'
                    '• Ambulance / Medical: 108\n'
                    '• Highway Assistance: 1033',
                    style: TextStyle(fontSize: 12, height: 1.5),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
