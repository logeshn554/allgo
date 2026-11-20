import 'package:flutter/material.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class PermissionRationaleDialog extends StatelessWidget {
  final String permissionType;
  final String title;
  final String rationale;
  final IconData icon;
  final VoidCallback onGrant;
  final VoidCallback onDeny;

  const PermissionRationaleDialog({
    super.key,
    required this.permissionType,
    required this.title,
    required this.rationale,
    required this.icon,
    required this.onGrant,
    required this.onDeny,
  });

  static Future<bool?> show(
    BuildContext context, {
    required String title,
    required String rationale,
    required IconData icon,
  }) {
    return showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => PermissionRationaleDialog(
        permissionType: 'LOCATION',
        title: title,
        rationale: rationale,
        icon: icon,
        onGrant: () => Navigator.of(ctx).pop(true),
        onDeny: () => Navigator.of(ctx).pop(false),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Row(
        children: [
          Icon(icon, color: AllGoColors.primary, size: 28),
          const SizedBox(width: 12),
          Expanded(child: Text(title, style: AllGoTypography.heading3)),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(rationale, style: AllGoTypography.bodyMedium),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AllGoColors.surface,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AllGoColors.divider),
            ),
            child: Row(
              children: [
                const Icon(Icons.security, size: 18, color: AllGoColors.success),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Protected under India DPDP Act 2023. Used solely for fulfillment.',
                    style: AllGoTypography.caption,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      actions: [
        TextButton(onPressed: onDeny, child: const Text('Not Now')),
        ElevatedButton(
          style: ElevatedButton.styleFrom(backgroundColor: AllGoColors.primary),
          onPressed: onGrant,
          child: const Text('Allow Permission'),
        ),
      ],
    );
  }
}
