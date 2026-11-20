import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_typography.dart';

class AllGoTheme {
  AllGoTheme._();

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.light(
        primary: AllGoColors.primary,
        secondary: AllGoColors.secondary,
        surface: AllGoColors.surface,
        error: AllGoColors.error,
        onPrimary: AllGoColors.textInverse,
        onSecondary: AllGoColors.textInverse,
        onSurface: AllGoColors.textPrimary,
        onError: AllGoColors.textInverse,
      ),
      scaffoldBackgroundColor: AllGoColors.background,
      fontFamily: 'Inter',
      appBarTheme: const AppBarTheme(
        backgroundColor: AllGoColors.surface,
        foregroundColor: AllGoColors.textPrimary,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: AllGoTypography.heading3,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AllGoColors.primary,
          foregroundColor: AllGoColors.textInverse,
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: AllGoTypography.button,
          elevation: 0,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AllGoColors.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AllGoColors.divider),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AllGoColors.divider),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AllGoColors.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AllGoColors.error),
        ),
        labelStyle: AllGoTypography.bodyMedium.copyWith(color: AllGoColors.textSecondary),
        hintStyle: AllGoTypography.bodyMedium.copyWith(color: AllGoColors.textTertiary),
      ),
      cardTheme: CardThemeData(
        color: AllGoColors.surface,
        elevation: 1,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AllGoColors.divider, width: 0.5),
        ),
        margin: EdgeInsets.zero,
      ),
    );
  }
}
