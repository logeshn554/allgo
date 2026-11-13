import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';

enum AllGoButtonVariant { primary, secondary, outlined }

class AllGoButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final AllGoButtonVariant variant;
  final IconData? icon;

  const AllGoButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    this.variant = AllGoButtonVariant.primary,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    if (variant == AllGoButtonVariant.outlined) {
      return OutlinedButton(
        onPressed: isLoading ? null : onPressed,
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          side: const BorderSide(color: AllGoColors.primary, width: 1.5),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          foregroundColor: AllGoColors.primary,
        ),
        child: _buildChild(AllGoColors.primary),
      );
    }

    final backgroundColor = variant == AllGoButtonVariant.secondary
        ? AllGoColors.secondary
        : AllGoColors.primary;

    return ElevatedButton(
      onPressed: isLoading ? null : onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: backgroundColor,
        foregroundColor: AllGoColors.textInverse,
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        elevation: 0,
      ),
      child: _buildChild(AllGoColors.textInverse),
    );
  }

  Widget _buildChild(Color contentColor) {
    if (isLoading) {
      return SizedBox(
        height: 22,
        width: 22,
        child: CircularProgressIndicator(
          strokeWidth: 2.5,
          color: contentColor,
        ),
      );
    }
    if (icon != null) {
      return Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 20, color: contentColor),
          const SizedBox(width: 8),
          Text(label, style: AllGoTypography.button.copyWith(color: contentColor)),
        ],
      );
    }
    return Text(label, style: AllGoTypography.button.copyWith(color: contentColor));
  }
}
