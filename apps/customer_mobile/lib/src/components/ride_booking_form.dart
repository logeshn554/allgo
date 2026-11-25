import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class RideBookingForm extends StatelessWidget {
  final TextEditingController pickupCtrl;
  final TextEditingController destCtrl;
  final TextEditingController promoCtrl;
  final double pickupLat;
  final double pickupLng;
  final double destLat;
  final double destLng;
  final String selectedCategory;
  final String selectedPaymentMethod;
  final ValueChanged<String> onSelectCategory;
  final ValueChanged<String> onSelectPaymentMethod;
  final List<RideFareEstimateModel> fareEstimates;
  final List<PlacePredictionModel> predictions;
  final bool searchingPickup;
  final List<CustomerAddressModel> savedAddresses;
  final bool isEstimating;
  final bool isBooking;
  final ValueChanged<String> onPickupChanged;
  final ValueChanged<String> onDestChanged;
  final ValueChanged<PlacePredictionModel> onSelectPrediction;
  final ValueChanged<CustomerAddressModel> onUseSavedDestination;
  final VoidCallback onGetEstimate;
  final VoidCallback onConfirmRide;
  final VoidCallback? onPickPickupOnMap;
  final VoidCallback? onPickDestOnMap;

  const RideBookingForm({
    super.key,
    required this.pickupCtrl,
    required this.destCtrl,
    required this.promoCtrl,
    required this.pickupLat,
    required this.pickupLng,
    required this.destLat,
    required this.destLng,
    required this.selectedCategory,
    required this.selectedPaymentMethod,
    required this.onSelectCategory,
    required this.onSelectPaymentMethod,
    required this.fareEstimates,
    required this.predictions,
    required this.searchingPickup,
    required this.savedAddresses,
    required this.isEstimating,
    required this.isBooking,
    required this.onPickupChanged,
    required this.onDestChanged,
    required this.onSelectPrediction,
    required this.onUseSavedDestination,
    required this.onGetEstimate,
    required this.onConfirmRide,
    this.onPickPickupOnMap,
    this.onPickDestOnMap,
  });

  RideFareEstimateModel? _estimateFor(String category) {
    for (final est in fareEstimates) {
      if (est.vehicleCategory.toUpperCase() == category.toUpperCase()) return est;
    }
    return null;
  }

  Widget _buildCategoryTile(
    String title,
    String subtitle,
    String category,
    IconData icon,
  ) {
    final isSelected = selectedCategory == category;
    final estimate = _estimateFor(category);

    return GestureDetector(
      onTap: () => onSelectCategory(category),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected ? AllGoColors.primary.withValues(alpha: 0.08) : AllGoColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AllGoColors.primary : AllGoColors.divider,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(icon, color: isSelected ? AllGoColors.primary : Colors.grey, size: 28),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.bold)),
                  Text(
                    estimate != null
                        ? '$subtitle • ~${estimate.estimatedDurationMinutes} mins (${estimate.estimatedDistanceKm.toStringAsFixed(1)} km)'
                        : subtitle,
                    style: AllGoTypography.caption,
                  ),
                ],
              ),
            ),
            if (estimate != null)
              Text(
                '₹${estimate.totalFareInr.toStringAsFixed(0)}',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AllGoColors.primary),
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final selectedEstimate = _estimateFor(selectedCategory) ?? (fareEstimates.isNotEmpty ? fareEstimates.first : null);

    final markers = <Marker>{
      Marker(
        markerId: const MarkerId('pickup'),
        position: LatLng(pickupLat, pickupLng),
        infoWindow: const InfoWindow(title: 'Pickup'),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
      ),
      if (destCtrl.text.trim().isNotEmpty)
        Marker(
          markerId: const MarkerId('dropoff'),
          position: LatLng(destLat, destLng),
          infoWindow: const InfoWindow(title: 'Dropoff'),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
        ),
    };

    final polylines = <Polyline>{
      if (destCtrl.text.trim().isNotEmpty)
        Polyline(
          polylineId: const PolylineId('route'),
          color: AllGoColors.primary,
          width: 4,
          points: [LatLng(pickupLat, pickupLng), LatLng(destLat, destLng)],
        ),
    };

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: SizedBox(
            height: 190,
            child: GoogleMap(
              initialCameraPosition: CameraPosition(
                target: LatLng(pickupLat, pickupLng),
                zoom: 13.5,
              ),
              markers: markers,
              polylines: polylines,
              myLocationButtonEnabled: false,
              zoomControlsEnabled: false,
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: pickupCtrl,
                        onChanged: onPickupChanged,
                        decoration: const InputDecoration(
                          labelText: 'Pickup Location',
                          prefixIcon: Icon(Icons.my_location, color: Colors.green),
                          isDense: true,
                        ),
                      ),
                    ),
                    if (onPickPickupOnMap != null)
                      IconButton(
                        icon: const Icon(Icons.map_outlined, color: AllGoColors.primary),
                        tooltip: 'Pin pickup on map',
                        onPressed: onPickPickupOnMap,
                      ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: destCtrl,
                        onChanged: onDestChanged,
                        decoration: const InputDecoration(
                          labelText: 'Where to? (Dropoff)',
                          prefixIcon: Icon(Icons.location_on, color: Colors.red),
                          isDense: true,
                        ),
                      ),
                    ),
                    if (onPickDestOnMap != null)
                      IconButton(
                        icon: const Icon(Icons.map_outlined, color: AllGoColors.primary),
                        tooltip: 'Pin destination on map',
                        onPressed: onPickDestOnMap,
                      ),
                  ],
                ),
                if (predictions.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Container(
                    decoration: BoxDecoration(
                      border: Border.all(color: AllGoColors.divider),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      children: predictions.take(4).map((p) {
                        return ListTile(
                          dense: true,
                          leading: Icon(
                            searchingPickup ? Icons.my_location : Icons.place_outlined,
                            size: 18,
                          ),
                          title: Text(p.mainText, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                          subtitle: Text(p.secondaryText, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11)),
                          onTap: () => onSelectPrediction(p),
                        );
                      }).toList(),
                    ),
                  ),
                ],
                if (savedAddresses.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  SizedBox(
                    height: 34,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: savedAddresses.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 8),
                      itemBuilder: (ctx, i) {
                        final addr = savedAddresses[i];
                        return ActionChip(
                          avatar: const Icon(Icons.bookmark_outline, size: 14),
                          label: Text(addr.label, style: const TextStyle(fontSize: 11)),
                          onPressed: () => onUseSavedDestination(addr),
                        );
                      },
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                AllGoButton(
                  label: 'Compare Ride Fares',
                  isLoading: isEstimating,
                  onPressed: onGetEstimate,
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Text('Choose AllGo Ride', style: AllGoTypography.heading3.copyWith(fontSize: 16)),
        const SizedBox(height: 10),
        _buildCategoryTile('AllGo Bike', 'Fastest through traffic (1 rider)', 'BIKE', Icons.two_wheeler),
        _buildCategoryTile('AllGo Auto', 'Affordable doorstep 3-wheeler', 'AUTO', Icons.electric_rickshaw),
        _buildCategoryTile('Economy Cab', 'AC Mini & Hatchback', 'CAB_ECONOMY', Icons.directions_car),
        _buildCategoryTile('Premium Cab', 'Comfort Sedan & SUV', 'CAB_PREMIUM', Icons.local_taxi),
        if (selectedEstimate != null) ...[
          const SizedBox(height: 12),
          Card(
            color: Colors.green.shade50,
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${selectedEstimate.vehicleCategory.replaceAll('_', ' ')} Fare',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                      Text(
                        '₹${selectedEstimate.totalFareInr.toStringAsFixed(0)}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20, color: Colors.green),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Base ₹${selectedEstimate.baseFareInr.toStringAsFixed(0)} + Distance ₹${selectedEstimate.distanceFareInr.toStringAsFixed(0)} + Taxes ₹${selectedEstimate.gstInr.toStringAsFixed(0)}',
                    style: const TextStyle(fontSize: 11, color: Colors.black54),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    children: ['CASH', 'UPI', 'WALLET'].map((method) {
                      return ChoiceChip(
                        label: Text(method, style: const TextStyle(fontSize: 11)),
                        selected: selectedPaymentMethod == method,
                        onSelected: (_) => onSelectPaymentMethod(method),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: promoCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Promo Code (Optional)',
                      isDense: true,
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  AllGoButton(
                    label: 'Confirm & Book ${selectedCategory.replaceAll('_', ' ')}',
                    icon: Icons.check,
                    isLoading: isBooking,
                    onPressed: onConfirmRide,
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}
