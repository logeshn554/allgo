import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import '../data/state/auth_notifier.dart';

class LanguageOption {
  final String code;
  final String title;
  final String subtitle;

  const LanguageOption({required this.code, required this.title, required this.subtitle});
}

class LanguageSelectionSheet extends ConsumerWidget {
  const LanguageSelectionSheet({super.key});

  static const List<LanguageOption> supportedLanguages = [
    LanguageOption(code: 'en', title: 'English', subtitle: 'Default Language'),
    LanguageOption(code: 'ta', title: 'தமிழ்', subtitle: 'Tamil - தமிழ் நாடு'),
    LanguageOption(code: 'hi', title: 'हिन्दी', subtitle: 'Hindi - भारत'),
  ];

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      backgroundColor: AllGoColors.surface,
      builder: (_) => const LanguageSelectionSheet(),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final currentLang = user?.defaultLanguage ?? 'en';

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(color: AllGoColors.divider, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: 16),
            Text('Select Language / மொழி தேர்வு / भाषा चुनें', style: AllGoTypography.heading3),
            const SizedBox(height: 4),
            Text('Choose your preferred language for the app experience.', style: AllGoTypography.caption),
            const SizedBox(height: 16),
            ...supportedLanguages.map((lang) {
              final isSelected = lang.code == currentLang;
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                decoration: BoxDecoration(
                  color: isSelected ? AllGoColors.primaryLight.withValues(alpha: 0.15) : AllGoColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isSelected ? AllGoColors.primary : AllGoColors.divider,
                    width: isSelected ? 1.5 : 0.8,
                  ),
                ),
                child: ListTile(
                  title: Text(lang.title, style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.bold)),
                  subtitle: Text(lang.subtitle, style: AllGoTypography.caption),
                  trailing: isSelected
                      ? const Icon(Icons.check_circle, color: AllGoColors.primary)
                      : const Icon(Icons.radio_button_unchecked, color: AllGoColors.textTertiary),
                  onTap: () {
                    ref.read(authNotifierProvider.notifier).updateLanguage(lang.code);
                    Navigator.of(context).pop();
                  },
                ),
              );
            }),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
