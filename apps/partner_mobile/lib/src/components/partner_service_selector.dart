import 'package:flutter/material.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class PartnerServiceSelector extends StatelessWidget {
  final Set<String> selectedServices;
  final void Function(String serviceKey, bool isSelected) onToggle;

  const PartnerServiceSelector({
    super.key,
    required this.selectedServices,
    required this.onToggle,
  });

  Widget _buildCheckbox(String key, String label) {
    return CheckboxListTile(
      value: selectedServices.contains(key),
      title: Text(label, style: AllGoTypography.bodyMedium),
      activeColor: AllGoColors.primary,
      contentPadding: EdgeInsets.zero,
      onChanged: (val) => onToggle(key, val ?? false),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Select Operating Services',
          style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        _buildCheckbox('FOOD_DELIVERY', 'Food & Grocery Hyperlocal Delivery'),
        _buildCheckbox('PARCEL', 'Direct Parcel Courier Delivery'),
        _buildCheckbox('BIKE_TAXI', 'Bike Taxi Two-Wheeler Mobility'),
        _buildCheckbox('AUTO', 'Auto Rickshaw Passenger Ride'),
        _buildCheckbox('CAB_ECONOMY', 'Cab Economy Passenger Ride'),
        _buildCheckbox('CAB_PREMIUM', 'Cab Premium Passenger Ride'),
        _buildCheckbox('CAB_SEDAN', 'Cab Sedan Passenger Ride'),
      ],
    );
  }
}
