import 'package:flutter/material.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class PartnerRegistrationScreen extends StatefulWidget {
  const PartnerRegistrationScreen({super.key});

  @override
  State<PartnerRegistrationScreen> createState() => _PartnerRegistrationScreenState();
}

class _PartnerRegistrationScreenState extends State<PartnerRegistrationScreen> {
  String _selectedVehicle = 'MOTORCYCLE';
  final _dlController = TextEditingController();
  final _rcController = TextEditingController();

  @override
  void dispose() {
    _dlController.dispose();
    _rcController.dispose();
    super.dispose();
  }

  void _handleSubmit() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Documents submitted for administrative review.'),
        backgroundColor: AllGoColors.success,
      ),
    );
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AllGoColors.background,
      appBar: const AllGoAppBar(title: 'Partner Registration'),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Vehicle & Service Details', style: AllGoTypography.heading2),
              const SizedBox(height: 8),
              Text(
                'Select your vehicle type and provide registration details for verification.',
                style: AllGoTypography.subtitle,
              ),
              const SizedBox(height: 24),

              Text('Vehicle Type', style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: AllGoColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AllGoColors.divider),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedVehicle,
                    isExpanded: true,
                    items: const [
                      DropdownMenuItem(value: 'BICYCLE', child: Text('Bicycle (Hyperlocal Delivery)')),
                      DropdownMenuItem(value: 'MOTORCYCLE', child: Text('Motorcycle / Scooter (Deliveries & Bike Taxi)')),
                      DropdownMenuItem(value: 'AUTO_RICKSHAW', child: Text('Auto Rickshaw (Mobility & Parcels)')),
                      DropdownMenuItem(value: 'CAB_SEDAN', child: Text('Cab Sedan / Hatchback (Passenger Mobility)')),
                    ],
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedVehicle = val);
                    },
                  ),
                ),
              ),
              const SizedBox(height: 20),

              AllGoTextField(
                label: 'Driving License Number',
                hint: 'TN-01-2023-0001234',
                controller: _dlController,
              ),
              const SizedBox(height: 16),

              AllGoTextField(
                label: 'Vehicle Registration Number (RC)',
                hint: 'TN 09 AB 1234',
                controller: _rcController,
              ),
              const SizedBox(height: 24),

              // Upload Cards
              _buildUploadCard('Upload Driving License Photo (Front & Back)', Icons.badge_outlined),
              const SizedBox(height: 12),
              _buildUploadCard('Upload Vehicle RC Certificate', Icons.description_outlined),

              const SizedBox(height: 36),
              AllGoButton(
                label: 'Submit for Approval',
                variant: AllGoButtonVariant.secondary,
                onPressed: _handleSubmit,
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildUploadCard(String title, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AllGoColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AllGoColors.divider, style: BorderStyle.solid),
      ),
      child: Row(
        children: [
          Icon(icon, color: AllGoColors.secondary, size: 28),
          const SizedBox(width: 14),
          Expanded(
            child: Text(title, style: AllGoTypography.bodyMedium),
          ),
          const Icon(Icons.upload_file, color: AllGoColors.textTertiary, size: 22),
        ],
      ),
    );
  }
}
