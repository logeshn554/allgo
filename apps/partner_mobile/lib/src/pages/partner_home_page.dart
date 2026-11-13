import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

import '../components/partner_duty_header.dart';
import '../components/active_delivery_card.dart';
import '../components/active_parcel_card.dart';
import '../components/active_ride_card.dart';
import '../components/active_hire_driver_card.dart';
import '../components/partner_offers_banner.dart';
import '../components/partner_metrics_card.dart';
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

  DeliveryJobModel? _activeJob;
  List<DeliveryOfferModel> _activeOffers = [];
  ParcelModel? _activeParcel;
  List<ParcelOffer> _activeParcelOffers = [];
  RideModel? _activeRide;
  List<RideOfferModel> _activeRideOffers = [];
  HireDriverBookingModel? _activeHireDriver;

  Timer? _heartbeatTimer;
  Timer? _offersTimer;
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
    _pollAll();
    _startTimers();
  }

  @override
  void dispose() {
    _heartbeatTimer?.cancel();
    _offersTimer?.cancel();
    super.dispose();
  }

  void _startTimers() {
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (_isOnline) {
        ref.read(apiClientProvider).partnerHeartbeat(13.0827, 80.2707).catchError((_) {});
      }
    });
    _offersTimer = Timer.periodic(const Duration(seconds: 8), (_) {
      if (_isOnline && mounted) _pollAll();
    });
  }

  Future<void> _initContinuityMode() async {
    try {
      final res = await ref.read(apiClientProvider).getPartnerContinuityMode();
      if (mounted && res['mode'] != null) {
        setState(() {
          _activeMode = res['mode'] as String;
          _activeVerticalLock = res['activeVerticalLock'] as String?;
        });
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
        });
      }
    } catch (_) {}
  }

  Future<void> _toggleOnline(bool val) async {
    setState(() => _isActionBusy = true);
    final client = ref.read(apiClientProvider);
    try {
      if (val) {
        await client.partnerGoOnline(13.0827, 80.2707);
      } else {
        await client.partnerGoOffline();
      }
      setState(() => _isOnline = val);
      _pollAll();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
    } finally {
      if (mounted) setState(() => _isActionBusy = false);
    }
  }

  Future<void> _changeMode(String modeKey) async {
    setState(() => _isActionBusy = true);
    try {
      await ref.read(apiClientProvider).updatePartnerContinuityMode(modeKey);
      setState(() => _activeMode = modeKey);
      _pollAll();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Mode switch failed: $e')));
    } finally {
      if (mounted) setState(() => _isActionBusy = false);
    }
  }

  Widget _buildDutyTab() {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      children: [
        if (_activeJob != null) ...[
          ActiveDeliveryCard(
            activeJob: _activeJob!,
            isActionBusy: _isActionBusy,
            onArrivedPickup: () => _actions.arrivedPickup(_activeJob!.id),
            onStartDelivery: () => _actions.startDelivery(_activeJob!.id),
            onArrivedDestination: () => _actions.arrivedDestination(_activeJob!.id),
            onCompleteDelivery: () => _actions.completeDelivery(_activeJob!.id, '1234'),
            onReportException: () => clientReportException(_activeJob!.id),
          ),
          const SizedBox(height: 16),
        ],
        if (_activeParcel != null) ...[
          ActiveParcelCard(
            activeParcel: _activeParcel!,
            isActionBusy: _isActionBusy,
            onArrivedPickup: () => _actions.confirmParcelArrivedPickup(_activeParcel!.id),
            onVerifyPickupOtp: () => _actions.verifyParcelPickupOtp(_activeParcel!.id, '1234'),
            onStartTransit: () => _actions.startParcelTransit(_activeParcel!.id),
            onArrivedDestination: () => _actions.confirmParcelArrivedDestination(_activeParcel!.id),
            onVerifyDeliveryOtp: () => _actions.verifyParcelDeliveryOtp(_activeParcel!.id, '5678'),
            onRecordFailure: () => _actions.rejectParcelOffer(_activeParcel!.id),
            onInitiateReturn: () => _actions.rejectParcelOffer(_activeParcel!.id),
          ),
          const SizedBox(height: 16),
        ],
        if (_activeRide != null) ...[
          ActiveRideCard(
            activeRide: _activeRide!,
            isActionBusy: _isActionBusy,
            onArrivedPickup: () => _actions.driverArrivedRide(_activeRide!.id),
            onStartTrip: () => _actions.driverStartTrip(_activeRide!.id, '1234'),
            onCompleteTrip: () => _actions.driverCompleteTrip(_activeRide!.id),
          ),
          const SizedBox(height: 16),
        ],
        if (_activeHireDriver != null) ...[
          ActiveHireDriverCard(
            activeHireDriver: _activeHireDriver!,
            isActionBusy: _isActionBusy,
            onArrived: () => _pollAll(),
            onStartDuty: () => _pollAll(),
            onEndDuty: () => _pollAll(),
          ),
          const SizedBox(height: 16),
        ],
        if (_activeOffers.isNotEmpty || _activeParcelOffers.isNotEmpty || _activeRideOffers.isNotEmpty) ...[
          PartnerOffersBanner(
            deliveryOffers: _activeOffers,
            parcelOffers: _activeParcelOffers,
            rideOffers: _activeRideOffers,
            isActionBusy: _isActionBusy,
            onAcceptDelivery: (id) => _actions.acceptOffer(id),
            onRejectDelivery: (id) => _actions.rejectOffer(id),
            onAcceptParcel: (id) => _actions.acceptParcelOffer(id),
            onRejectParcel: (id) => _actions.rejectParcelOffer(id),
            onAcceptRide: (id) => _actions.acceptRideOffer(id),
            onRejectRide: (id) => _actions.rejectRideOffer(id),
          ),
          const SizedBox(height: 16),
        ],
        const PartnerMetricsCard(completedJobsCount: 8, totalEarnings: 1420),
      ],
    );
  }

  void clientReportException(String jobId) {
    ref.read(apiClientProvider).partnerReportException(jobId, 'CUSTOMER_UNREACHABLE', 'Waiting at gate').then((_) => _pollAll());
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
