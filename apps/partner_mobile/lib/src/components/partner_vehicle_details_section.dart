import 'package:flutter/material.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class PartnerVehicleDetailsSection extends StatelessWidget {
  final String selectedVehicle;
  final ValueChanged<String> onVehicleChanged;
  final TextEditingController regNumberController;
  final TextEditingController makeModelController;
  final TextEditingController dlNumberController;

  const PartnerVehicleDetailsSection({
    super.key,
    required this.selectedVehicle,
    required this.onVehicleChanged,
    required this.regNumberController,
    required this.makeModelController,
    required this.dlNumberController,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: AllGoColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AllGoColors.divider),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: selectedVehicle,
              isExpanded: true,
              items: const [
                DropdownMenuItem(value: 'BICYCLE', child: Text('Bicycle (Hyperlocal Delivery)')),
                DropdownMenuItem(value: 'MOTORCYCLE', child: Text('Motorcycle / Scooter (Delivery & Taxi)')),
                DropdownMenuItem(value: 'AUTO_RICKSHAW', child: Text('Auto Rickshaw (Mobility & Parcels)')),
                DropdownMenuItem(value: 'CAB_SEDAN', child: Text('Cab Sedan (Passenger Rides)')),
              ],
              onChanged: (val) {
                if (val != null) onVehicleChanged(val);
              },
            ),
          ),
        ),
        const SizedBox(height: 12),
        AllGoTextField(
          label: 'Vehicle Registration Plate Number',
          hint: 'TN 01 AB 1234',
          controller: regNumberController,
          validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
        ),
        const SizedBox(height: 12),
        AllGoTextField(
          label: 'Make and Model',
          hint: 'Hero Splendor / Bajaj Pulsar',
          controller: makeModelController,
          validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
        ),
        const SizedBox(height: 12),
        AllGoTextField(
          label: 'Driving License Number',
          hint: 'DL-1420110012345',
          controller: dlNumberController,
          validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
        ),
      ],
    );
  }
}
