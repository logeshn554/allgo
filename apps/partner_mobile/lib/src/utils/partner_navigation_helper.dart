import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class PartnerNavigationHelper {
  static Future<void> openDirections({
    required BuildContext context,
    double? latitude,
    double? longitude,
    required String addressFallback,
    String travelMode = 'driving',
  }) async {
    final destination = (latitude != null && longitude != null && (latitude != 0 || longitude != 0))
        ? '$latitude,$longitude'
        : Uri.encodeComponent(addressFallback);
    final uri = Uri.parse(
      'https://www.google.com/maps/dir/?api=1&destination=$destination&travelmode=$travelMode',
    );
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to open Google Maps navigation on this device.')),
      );
    }
  }

  static Future<void> callPhone(BuildContext context, String? phone) async {
    if (phone == null || phone.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Contact number unavailable for this trip.')),
      );
      return;
    }
    final uri = Uri.parse('tel:${phone.trim()}');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }
}
