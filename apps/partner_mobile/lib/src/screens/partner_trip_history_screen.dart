import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class PartnerTripHistoryScreen extends ConsumerStatefulWidget {
  const PartnerTripHistoryScreen({super.key});

  @override
  ConsumerState<PartnerTripHistoryScreen> createState() => _PartnerTripHistoryScreenState();
}

class _PartnerTripHistoryScreenState extends ConsumerState<PartnerTripHistoryScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = true;
  String? _error;

  List<ParcelModel> _parcels = [];
  List<RideModel> _rides = [];
  List<HireDriverBookingModel> _chauffeurTrips = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadHistory();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadHistory() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final client = ref.read(apiClientProvider);
      final results = await Future.wait([
        client.getPartnerParcelHistory(limit: 30).catchError((_) => <ParcelModel>[]),
        client.listRides().catchError((_) => <RideModel>[]),
        client.listBookings().catchError((_) => <HireDriverBookingModel>[]),
      ]);
      if (!mounted) return;
      setState(() {
        _parcels = results[0] as List<ParcelModel>;
        _rides = results[1] as List<RideModel>;
        _chauffeurTrips = results[2] as List<HireDriverBookingModel>;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Failed to load trip history: $e';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AllGoColors.background,
      appBar: AppBar(
        title: const Text('Trip & Delivery History'),
        backgroundColor: AllGoColors.surface,
        foregroundColor: AllGoColors.textPrimary,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          labelColor: AllGoColors.primary,
          unselectedLabelColor: AllGoColors.textSecondary,
          tabs: [
            Tab(text: 'Parcels (${_parcels.length})'),
            Tab(text: 'Rides (${_rides.length})'),
            Tab(text: 'Chauffeur (${_chauffeurTrips.length})'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, style: AllGoTypography.bodyMedium))
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildParcelList(),
                    _buildRideList(),
                    _buildChauffeurList(),
                  ],
                ),
    );
  }

  Widget _buildParcelList() {
    if (_parcels.isEmpty) {
      return const Center(child: Text('No parcel deliveries recorded yet.'));
    }
    return RefreshIndicator(
      onRefresh: _loadHistory,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _parcels.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) {
          final p = _parcels[i];
          return ListTile(
            tileColor: AllGoColors.surface,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            leading: const Icon(Icons.local_shipping_outlined, color: AllGoColors.primary),
            title: Text(p.pickupAddress, maxLines: 1, overflow: TextOverflow.ellipsis),
            subtitle: Text('To: ${p.dropAddress} • ${p.status}', maxLines: 2),
            trailing: Text(
              '₹${p.totalFareInr.toStringAsFixed(0)}',
              style: const TextStyle(fontWeight: FontWeight.bold, color: AllGoColors.success),
            ),
          );
        },
      ),
    );
  }

  Widget _buildRideList() {
    if (_rides.isEmpty) {
      return const Center(child: Text('No rides completed yet.'));
    }
    return RefreshIndicator(
      onRefresh: _loadHistory,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _rides.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) {
          final r = _rides[i];
          return ListTile(
            tileColor: AllGoColors.surface,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            leading: const Icon(Icons.two_wheeler, color: AllGoColors.secondary),
            title: Text(r.pickupAddress, maxLines: 1, overflow: TextOverflow.ellipsis),
            subtitle: Text('To: ${r.dropAddress} • ${r.status}', maxLines: 2),
            trailing: Text(
              '₹${(r.finalFareInr ?? r.estimatedFareInr).toStringAsFixed(0)}',
              style: const TextStyle(fontWeight: FontWeight.bold, color: AllGoColors.success),
            ),
          );
        },
      ),
    );
  }

  Widget _buildChauffeurList() {
    if (_chauffeurTrips.isEmpty) {
      return const Center(child: Text('No chauffeur duties recorded yet.'));
    }
    return RefreshIndicator(
      onRefresh: _loadHistory,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _chauffeurTrips.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) {
          final h = _chauffeurTrips[i];
          return ListTile(
            tileColor: AllGoColors.surface,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            leading: const Icon(Icons.directions_car_outlined, color: AllGoColors.primary),
            title: Text(h.pickupAddress, maxLines: 1, overflow: TextOverflow.ellipsis),
            subtitle: Text('${h.durationHours}h • ${h.status}'),
            trailing: Text(
              '₹${(h.finalFareInr ?? h.estimatedFareInr).toStringAsFixed(0)}',
              style: const TextStyle(fontWeight: FontWeight.bold, color: AllGoColors.success),
            ),
          );
        },
      ),
    );
  }
}
