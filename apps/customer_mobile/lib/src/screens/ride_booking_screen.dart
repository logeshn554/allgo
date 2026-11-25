import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

import '../components/ride_booking_form.dart';
import '../components/active_ride_tracking_view.dart';
import '../components/ride_completion_rating_sheet.dart';
import 'map_coordinate_picker_modal.dart';
import '../common/friendly_error.dart';

class RideBookingScreen extends ConsumerStatefulWidget {
  final String? activeRideId;

  const RideBookingScreen({super.key, this.activeRideId});

  @override
  ConsumerState<RideBookingScreen> createState() => _RideBookingScreenState();
}

class _RideBookingScreenState extends ConsumerState<RideBookingScreen> {
  final _pickupCtrl = TextEditingController(text: 'Current Location');
  final _destCtrl = TextEditingController();
  final _promoCtrl = TextEditingController();

  double _pickupLat = 13.0827;
  double _pickupLng = 80.2707;
  double _destLat = 13.0405;
  double _destLng = 80.2337;
  double? _driverLat;
  double? _driverLng;

  String _selectedCategory = 'AUTO';
  String _selectedPaymentMethod = 'UPI';
  List<RideFareEstimateModel> _fareEstimates = [];
  List<PlacePredictionModel> _predictions = [];
  List<CustomerAddressModel> _savedAddresses = [];
  bool _searchingPickup = false;
  bool _isEstimating = false;
  bool _isBooking = false;
  bool _isCancelling = false;
  bool _isTriggeringSos = false;

  RideModel? _activeRide;
  Timer? _pollingTimer;
  Timer? _searchDebounce;
  RealtimeSocketService? _socketService;
  StreamSubscription<Map<String, dynamic>>? _locSub;
  StreamSubscription<Map<String, dynamic>>? _statusSub;

  @override
  void initState() {
    super.initState();
    if (widget.activeRideId != null) {
      _loadRide(widget.activeRideId!);
    }
    _initPickupLocation();
    _initSocket();
    _startFallbackPolling();
  }

  Future<void> _initSocket() async {
    final client = ref.read(apiClientProvider);
    final socket = RealtimeSocketService(
      baseUrl: client.baseUrl,
      tokenStorage: client.tokenStorage,
    );
    _socketService = socket;
    _locSub = socket.onLocationUpdate.listen((payload) {
      if (!mounted) return;
      final lat = (payload['latitude'] as num?)?.toDouble();
      final lng = (payload['longitude'] as num?)?.toDouble();
      if (lat != null && lng != null) {
        setState(() {
          _driverLat = lat;
          _driverLng = lng;
        });
      }
    });
    _statusSub = socket.onStatusChanged.listen((_) {
      if (_activeRide != null && mounted) _loadRide(_activeRide!.id);
    });
    await socket.connect();
  }

  Future<void> _initPickupLocation() async {
    try {
      final addresses = await ref.read(apiClientProvider).listCustomerAddresses();
      if (addresses.isNotEmpty && mounted) {
        final def = addresses.firstWhere((a) => a.isDefault, orElse: () => addresses.first);
        setState(() {
          _savedAddresses = addresses;
          _pickupCtrl.text = '${def.addressLine1}, ${def.city}';
          _pickupLat = def.latitude;
          _pickupLng = def.longitude;
        });
        return;
      }
    } catch (e, st) {
      FriendlyError.from(e, st);
    }

    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.whileInUse || perm == LocationPermission.always) {
        final pos = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
          timeLimit: const Duration(seconds: 4),
        );
        if (mounted) {
          _pickupLat = pos.latitude;
          _pickupLng = pos.longitude;
          try {
            final rev = await ref.read(apiClientProvider).reverseGeocode(pos.latitude, pos.longitude);
            _pickupCtrl.text = rev.formattedAddress;
          } catch (e, st) {
            FriendlyError.from(e, st);
            _pickupCtrl.text = 'Current GPS Location';
          }
        }
      }
    } catch (e, st) {
      FriendlyError.from(e, st);
    }
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    _searchDebounce?.cancel();
    _locSub?.cancel();
    _statusSub?.cancel();
    _socketService?.dispose();
    _pickupCtrl.dispose();
    _destCtrl.dispose();
    _promoCtrl.dispose();
    super.dispose();
  }

  void _startFallbackPolling() {
    _pollingTimer = Timer.periodic(const Duration(seconds: 8), (_) {
      if (_activeRide != null && mounted && !(_socketService?.isConnected ?? false)) {
        _loadRide(_activeRide!.id);
      }
    });
  }

  Future<void> _loadRide(String rideId) async {
    try {
      final ride = await ref.read(apiClientProvider).getRide(rideId);
      if (mounted) setState(() => _activeRide = ride);
    } catch (e, st) {
      FriendlyError.from(e, st);
    }
  }

  void _searchPlaces(String query, {required bool isPickup}) {
    _searchDebounce?.cancel();
    if (query.trim().length < 2) {
      setState(() => _predictions = []);
      return;
    }
    _searchDebounce = Timer(const Duration(milliseconds: 300), () async {
      try {
        final results = await ref.read(apiClientProvider).searchPlaces(
          query.trim(),
          lat: _pickupLat,
          lng: _pickupLng,
        );
        if (mounted) {
          setState(() {
            _searchingPickup = isPickup;
            _predictions = results;
          });
        }
      } catch (_) {}
    });
  }

  Future<void> _selectPrediction(PlacePredictionModel prediction) async {
    try {
      final results = await ref.read(apiClientProvider).geocodeAddress(prediction.description);
      if (results.isNotEmpty && mounted) {
        final target = results.first;
        setState(() {
          if (_searchingPickup) {
            _pickupLat = target.latitude;
            _pickupLng = target.longitude;
            _pickupCtrl.text = prediction.description;
          } else {
            _destLat = target.latitude;
            _destLng = target.longitude;
            _destCtrl.text = prediction.description;
          }
          _predictions = [];
        });
        if (!_searchingPickup) {
          _handleGetEstimate();
        }
      }
    } catch (_) {}
  }

  Future<void> _pickPickupOnMap() async {
    final res = await showModalBottomSheet<MapLocationResult>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => MapCoordinatePickerModal(initialLat: _pickupLat, initialLng: _pickupLng),
    );
    if (res != null && mounted) {
      setState(() {
        _pickupLat = res.latitude;
        _pickupLng = res.longitude;
        _pickupCtrl.text = res.addressText;
      });
    }
  }

  Future<void> _pickDestOnMap() async {
    final res = await showModalBottomSheet<MapLocationResult>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => MapCoordinatePickerModal(initialLat: _destLat, initialLng: _destLng),
    );
    if (res != null && mounted) {
      setState(() {
        _destLat = res.latitude;
        _destLng = res.longitude;
        _destCtrl.text = res.addressText;
      });
      _handleGetEstimate();
    }
  }

  Future<void> _handleGetEstimate() async {
    if (_destCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter or pin destination location')),
      );
      return;
    }
    setState(() => _isEstimating = true);
    try {
      final res = await ref.read(apiClientProvider).estimateRideFare({
        'serviceType': _selectedCategory,
        'pickupLatitude': _pickupLat,
        'pickupLongitude': _pickupLng,
        'destinationLatitude': _destLat,
        'destinationLongitude': _destLng,
      });
      final list = res is List<RideFareEstimateModel> ? res : <RideFareEstimateModel>[];
      if (mounted) setState(() => _fareEstimates = list);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Estimate failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _isEstimating = false);
    }
  }

  Future<void> _handleConfirmRide() async {
    setState(() => _isBooking = true);
    try {
      final ride = await ref.read(apiClientProvider).bookRide({
        'serviceType': _selectedCategory,
        'pickupAddress': _pickupCtrl.text,
        'destinationAddress': _destCtrl.text,
        'pickupLatitude': _pickupLat,
        'pickupLongitude': _pickupLng,
        'destinationLatitude': _destLat,
        'destinationLongitude': _destLng,
        'paymentMethod': _selectedPaymentMethod,
        if (_promoCtrl.text.trim().isNotEmpty) 'couponCode': _promoCtrl.text.trim().toUpperCase(),
      });
      if (mounted) {
        setState(() => _activeRide = ride);
        _socketService?.subscribeJob(ride.id);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Booking failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _isBooking = false);
    }
  }

  Future<void> _handleCancelRide() async {
    if (_activeRide == null) return;
    setState(() => _isCancelling = true);
    try {
      await ref.read(apiClientProvider).cancelRide(_activeRide!.id, reason: 'Customer cancelled');
      if (mounted) setState(() => _activeRide = null);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Cancel failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _isCancelling = false);
    }
  }

  Future<void> _handleTriggerSos() async {
    if (_activeRide == null) return;
    setState(() => _isTriggeringSos = true);
    try {
      await ref.read(apiClientProvider).triggerRideSos(
        _activeRide!.id,
        latitude: _pickupLat,
        longitude: _pickupLng,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('EMERGENCY SOS ALERT BROADCASTED'), backgroundColor: Colors.red),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('SOS failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _isTriggeringSos = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ride = _activeRide;
    return Scaffold(
      backgroundColor: AllGoColors.background,
      appBar: AppBar(
        title: const Text('AllGo Rides'),
        actions: [
          if (ride != null)
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: () => _loadRide(ride.id),
            ),
        ],
      ),
      body: ride != null
          ? (ride.status == 'COMPLETED'
              ? RideCompletionRatingSheet(
                  ride: ride,
                  onDone: () => setState(() {
                    _activeRide = null;
                    _fareEstimates = [];
                  }),
                )
              : ActiveRideTrackingView(
                  ride: ride,
                  pickupLat: _pickupLat,
                  pickupLng: _pickupLng,
                  destLat: _destLat,
                  destLng: _destLng,
                  driverLat: _driverLat,
                  driverLng: _driverLng,
                  isCancelling: _isCancelling,
                  isTriggeringSos: _isTriggeringSos,
                  onCancel: _handleCancelRide,
                  onTriggerSos: _handleTriggerSos,
                ))
          : RideBookingForm(
              pickupCtrl: _pickupCtrl,
              destCtrl: _destCtrl,
              promoCtrl: _promoCtrl,
              pickupLat: _pickupLat,
              pickupLng: _pickupLng,
              destLat: _destLat,
              destLng: _destLng,
              selectedCategory: _selectedCategory,
              selectedPaymentMethod: _selectedPaymentMethod,
              onSelectCategory: (c) => setState(() => _selectedCategory = c),
              onSelectPaymentMethod: (m) => setState(() => _selectedPaymentMethod = m),
              fareEstimates: _fareEstimates,
              predictions: _predictions,
              searchingPickup: _searchingPickup,
              savedAddresses: _savedAddresses,
              isEstimating: _isEstimating,
              isBooking: _isBooking,
              onPickupChanged: (q) => _searchPlaces(q, isPickup: true),
              onDestChanged: (q) => _searchPlaces(q, isPickup: false),
              onSelectPrediction: _selectPrediction,
              onUseSavedDestination: (addr) {
                setState(() {
                  _destLat = addr.latitude;
                  _destLng = addr.longitude;
                  _destCtrl.text = '${addr.label}: ${addr.addressLine1}, ${addr.city}';
                  _predictions = [];
                });
                _handleGetEstimate();
              },
              onGetEstimate: _handleGetEstimate,
              onConfirmRide: _handleConfirmRide,
              onPickPickupOnMap: _pickPickupOnMap,
              onPickDestOnMap: _pickDestOnMap,
            ),
    );
  }
}
