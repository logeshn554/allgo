import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

import '../components/partner_duty_header.dart';
import '../components/partner_duty_tab_content.dart';
import '../data/partner_job_actions.dart';
import '../screens/partner_earnings_screen.dart';
import '../screens/partner_profile_screen.dart';

class PartnerHomePage extends ConsumerStatefulWidget {
  const PartnerHomePage({super.key});

  @override
  ConsumerState<PartnerHomePage> createState() => _PartnerHomePageState();
}

class _PartnerHomePageState extends ConsumerState<PartnerHomePage> {
  int _currentTabIndex = 0;
  bool _isOnline = false;
  bool _isActionBusy = false;
  String _activeMode = 'ALL_JOBS';
  String? _activeVerticalLock;

  double? _currentLat;
  double? _currentLng;
  double _currentHeading = 0.0;
  double _currentSpeedMps = 0.0;
  double _currentAccuracy = 10.0;

  int _completedTripsToday = 0;
  double _todayEarningsInr = 0.0;

  DeliveryJobModel? _activeJob;
  List<DeliveryOfferModel> _activeOffers = [];
  ParcelModel? _activeParcel;
  List<ParcelOffer> _activeParcelOffers = [];
  RideModel? _activeRide;
  List<RideOfferModel> _activeRideOffers = [];
  HireDriverBookingModel? _activeHireDriver;

  Timer? _heartbeatTimer;
  Timer? _locationPingTimer;
  Timer? _offersTimer;
  StreamSubscription<Position>? _positionSub;
  RealtimeSocketService? _socket;
  late PartnerJobActions _actions;

  @override
  void initState() {
    super.initState();
    _actions = PartnerJobActions(
      client: ref.read(apiClientProvider),
      onError: (err) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err))),
      onSuccess: () => _pollAll(),
    );
    _initContinuityMode();
    _initRealtimeSocket();
    _pollAll();
    _startTimers();
  }

  Future<void> _initRealtimeSocket() async {
    final socket = ref.read(realtimeSocketServiceProvider);
    _socket = socket;
    await socket.connect();
    socket.on('delivery:offer', (_) {
      if (mounted) _pollAll();
    });
    socket.on('job:status_changed', (_) {
      if (mounted) _pollAll();
    });
    socket.on('job:exception', (_) {
      if (mounted) _pollAll();
    });
  }

  @override
  void dispose() {
    _heartbeatTimer?.cancel();
    _locationPingTimer?.cancel();
    _offersTimer?.cancel();
    _positionSub?.cancel();
    _socket?.off('delivery:offer');
    _socket?.off('job:status_changed');
    _socket?.off('job:exception');
    super.dispose();
  }

  Future<Position?> _ensureGpsPosition() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please enable device Location / GPS services to go online.')),
        );
      }
      return null;
    }

    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
    if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Location permission is required for live dispatch and tracking.'),
            action: SnackBarAction(
              label: 'Settings',
              onPressed: Geolocator.openAppSettings,
            ),
          ),
        );
      }
      return null;
    }

    final pos = await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
      timeLimit: const Duration(seconds: 8),
    );
    _updateLocalPosition(pos);
    return pos;
  }

  void _updateLocalPosition(Position pos) {
    _currentLat = pos.latitude;
    _currentLng = pos.longitude;
    _currentHeading = pos.heading;
    _currentSpeedMps = pos.speed;
    _currentAccuracy = pos.accuracy;
  }

  void _startPositionStream() {
    _positionSub?.cancel();
    _positionSub = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
      ),
    ).listen((pos) {
      _updateLocalPosition(pos);
    }, onError: (_) {});
  }

  void _stopPositionStream() {
    _positionSub?.cancel();
    _positionSub = null;
  }

  void _startTimers() {
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (_isOnline && _currentLat != null && _currentLng != null) {
        ref.read(apiClientProvider).partnerHeartbeat(_currentLat!, _currentLng!).catchError((_) {});
      }
    });
    _locationPingTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (_isOnline && _currentLat != null && _currentLng != null) {
        ref.read(apiClientProvider).partnerUpdateLocation({
          'latitude': _currentLat,
          'longitude': _currentLng,
          'heading': _currentHeading,
          'speedMps': _currentSpeedMps,
          'accuracyMeters': _currentAccuracy,
          'recordedAt': DateTime.now().toIso8601String(),
        }).catchError((_) {});
      }
    });
    _offersTimer = Timer.periodic(const Duration(seconds: 8), (_) {
      if (_isOnline && mounted) _pollAll();
    });
  }

  Future<void> _initContinuityMode() async {
    try {
      final mode = await ref.read(apiClientProvider).getPartnerContinuityMode();
      if (mounted) {
        setState(() {
          _activeMode = mode.preferredMode;
          _activeVerticalLock = mode.activeVerticalLock;
          _isOnline = mode.isOnline;
        });
        if (mode.isOnline) {
          final pos = await _ensureGpsPosition();
          if (pos != null) _startPositionStream();
        }
      }
    } catch (_) {}
  }

  Future<void> _pollAll() async {
    if (!mounted) return;
    final client = ref.read(apiClientProvider);
    try {
      final job = await client.getPartnerActiveJob().catchError((_) => null);
      final parcel = await client.getPartnerActiveParcel().catchError((_) => null);
      final ride = await client.getPartnerActiveRide().catchError((_) => null);
      final hire = await client.getPartnerActiveHireDriver().catchError((_) => null);
      final earningsDash = await client.getPartnerEarningsDashboard().catchError((_) => <String, dynamic>{});

      List<DeliveryOfferModel> offers = [];
      List<ParcelOffer> pOffers = [];
      List<RideOfferModel> rOffers = [];

      if (_isOnline && job == null && parcel == null && ride == null && hire == null) {
        offers = await client.getPartnerOffers().catchError((_) => <DeliveryOfferModel>[]);
        pOffers = await client.getPartnerParcelOffers().catchError((_) => <ParcelOffer>[]);
        rOffers = await client.getPartnerRideOffers().catchError((_) => <RideOfferModel>[]);
      }

      if (mounted) {
        setState(() {
          _activeJob = job;
          _activeParcel = parcel;
          _activeRide = ride;
          _activeHireDriver = hire;
          _activeOffers = offers;
          _activeParcelOffers = pOffers;
          _activeRideOffers = rOffers;
          _completedTripsToday = (earningsDash['todayCompletedTrips'] as num?)?.toInt() ??
              (earningsDash['completedTrips'] as num?)?.toInt() ??
              _completedTripsToday;
          _todayEarningsInr = (earningsDash['todayEarningsInr'] as num?)?.toDouble() ??
              (earningsDash['totalSettledEarningsInr'] as num?)?.toDouble() ??
              _todayEarningsInr;
        });
      }
    } catch (_) {}
  }

  Future<void> _toggleOnline(bool val) async {
    setState(() => _isActionBusy = true);
    final client = ref.read(apiClientProvider);
    try {
      if (val) {
        final pos = await _ensureGpsPosition();
        if (pos == null) return;
        await client.partnerGoOnline(pos.latitude, pos.longitude);
        _startPositionStream();
      } else {
        await client.partnerGoOffline();
        _stopPositionStream();
      }
      setState(() => _isOnline = val);
      _pollAll();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _isActionBusy = false);
    }
  }

  Future<void> _changeMode(String modeKey) async {
    setState(() => _isActionBusy = true);
    try {
      await ref.read(apiClientProvider).updatePartnerContinuityMode(modeKey, isOnline: _isOnline);
      setState(() => _activeMode = modeKey);
      _pollAll();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Mode switch failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _isActionBusy = false);
    }
  }

  Widget _buildDutyTab() {
    return PartnerDutyTabContent(
      activeJob: _activeJob,
      activeParcel: _activeParcel,
      activeRide: _activeRide,
      activeHireDriver: _activeHireDriver,
      activeOffers: _activeOffers,
      activeParcelOffers: _activeParcelOffers,
      activeRideOffers: _activeRideOffers,
      completedJobsCount: _completedTripsToday,
      totalEarnings: _todayEarningsInr,
      isActionBusy: _isActionBusy,
      currentLat: _currentLat,
      currentLng: _currentLng,
      actions: _actions,
      onRefresh: _pollAll,
      onReportException: clientReportException,
    );
  }

  Future<void> clientReportException(String jobId) async {
    String selectedReason = 'CUSTOMER_UNREACHABLE';
    final notesCtrl = TextEditingController();
    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Report Delivery Exception', style: AllGoTypography.heading3),
              const SizedBox(height: 12),
              for (final reason in [
                ('CUSTOMER_UNREACHABLE', 'Customer Unreachable'),
                ('MERCHANT_DELAY', 'Merchant / Store Delay'),
                ('WRONG_ADDRESS', 'Incorrect Drop Address'),
                ('VEHICLE_BREAKDOWN', 'Vehicle / Flat Tyre Issue'),
              ])
                RadioListTile<String>(
                  value: reason.$1,
                  groupValue: selectedReason,
                  title: Text(reason.$2),
                  onChanged: (v) => setSheetState(() => selectedReason = v ?? selectedReason),
                ),
              TextField(
                controller: notesCtrl,
                decoration: const InputDecoration(
                  labelText: 'Additional Notes',
                  hintText: 'Describe the issue for dispatch support',
                  border: OutlineInputBorder(),
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 12),
              AllGoButton(
                label: 'Submit Exception Report',
                onPressed: () => Navigator.pop(ctx, true),
              ),
            ],
          ),
        ),
      ),
    );
    if (confirmed == true) {
      try {
        await ref.read(apiClientProvider).partnerReportException(
              jobId,
              selectedReason,
              notesCtrl.text.trim().isEmpty ? 'Reported by partner' : notesCtrl.text.trim(),
            );
        _pollAll();
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to report exception: $e')));
        }
      }
    }
    notesCtrl.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AllGoColors.background,
      appBar: AllGoAppBar(title: _currentTabIndex == 0 ? 'Partner Console' : _currentTabIndex == 1 ? 'Earnings Ledger' : 'Partner Profile'),
      body: _currentTabIndex == 0
          ? Column(
              children: [
                PartnerDutyHeader(
                  isOnline: _isOnline,
                  isActionBusy: _isActionBusy,
                  activeMode: _activeMode,
                  activeVerticalLock: _activeVerticalLock,
                  onToggleOnline: _toggleOnline,
                  onChangeMode: _changeMode,
                ),
                Expanded(child: _buildDutyTab()),
              ],
            )
          : _currentTabIndex == 1
              ? const PartnerEarningsScreen()
              : const PartnerProfileScreen(),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentTabIndex,
        onDestinationSelected: (i) => setState(() => _currentTabIndex = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.radar), label: 'Duty'),
          NavigationDestination(icon: Icon(Icons.account_balance_wallet), label: 'Earnings'),
          NavigationDestination(icon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}
