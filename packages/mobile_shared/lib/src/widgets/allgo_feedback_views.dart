import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';

class AllGoLoadingIndicator extends StatelessWidget {
  final String? message;

  const AllGoLoadingIndicator({super.key, this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(
            strokeWidth: 3,
            color: AllGoColors.primary,
          ),
          if (message != null) ...[
            const SizedBox(height: 16),
            Text(message!, style: AllGoTypography.bodyMedium.copyWith(color: AllGoColors.textSecondary)),
          ],
        ],
      ),
    );
  }
}

class AllGoErrorView extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;

  const AllGoErrorView({
    super.key,
    required this.message,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AllGoColors.error.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.error_outline, size: 48, color: AllGoColors.error),
            ),
            const SizedBox(height: 16),
            Text('Something went wrong', style: AllGoTypography.heading3),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: AllGoTypography.bodyMedium.copyWith(color: AllGoColors.textSecondary),
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh, size: 20),
                label: const Text('Try Again'),
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(160, 48),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class AllGoEmptyView extends StatelessWidget {
  final String title;
  final String message;
  final IconData icon;

  const AllGoEmptyView({
    super.key,
    required this.title,
    required this.message,
    this.icon = Icons.inbox_outlined,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 64, color: AllGoColors.textTertiary),
            const SizedBox(height: 16),
            Text(title, style: AllGoTypography.heading3),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: AllGoTypography.bodyMedium.copyWith(color: AllGoColors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}

class AllGoAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final List<Widget>? actions;
  final bool showBackButton;
  final VoidCallback? onBack;

  const AllGoAppBar({
    super.key,
    required this.title,
    this.actions,
    this.showBackButton = true,
    this.onBack,
  });

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      title: Text(title, style: AllGoTypography.heading3),
      leading: showBackButton
          ? IconButton(
              icon: const Icon(Icons.arrow_back_ios_new, size: 20),
              onPressed: onBack ?? () => Navigator.of(context).maybePop(),
            )
          : null,
      actions: actions,
      backgroundColor: AllGoColors.surface,
      elevation: 0,
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(1),
        child: Container(color: AllGoColors.divider, height: 1),
      ),
    );
  }
}
