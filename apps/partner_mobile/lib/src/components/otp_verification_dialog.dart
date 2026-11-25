import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class OtpVerificationDialog extends StatefulWidget {
  final String title;
  final String subtitle;
  final int length;

  const OtpVerificationDialog({
    super.key,
    required this.title,
    required this.subtitle,
    this.length = 4,
  });

  static Future<String?> show(
    BuildContext context, {
    required String title,
    required String subtitle,
    int length = 4,
  }) {
    return showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (_) => OtpVerificationDialog(
        title: title,
        subtitle: subtitle,
        length: length,
      ),
    );
  }

  @override
  State<OtpVerificationDialog> createState() => _OtpVerificationDialogState();
}

class _OtpVerificationDialogState extends State<OtpVerificationDialog> {
  final TextEditingController _controller = TextEditingController();
  String? _errorText;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() {
    final code = _controller.text.trim();
    if (code.length != widget.length) {
      setState(() => _errorText = 'Enter the ${widget.length}-digit verification PIN');
      return;
    }
    Navigator.of(context).pop(code);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.title, style: AllGoTypography.heading3),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(widget.subtitle, style: AllGoTypography.caption),
          const SizedBox(height: 14),
          TextField(
            controller: _controller,
            autofocus: true,
            keyboardType: TextInputType.number,
            maxLength: widget.length,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              letterSpacing: 6,
            ),
            decoration: InputDecoration(
              hintText: List.filled(widget.length, '•').join(),
              counterText: '',
              errorText: _errorText,
              border: const OutlineInputBorder(),
            ),
            onSubmitted: (_) => _submit(),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: AllGoColors.primary,
            foregroundColor: Colors.white,
          ),
          onPressed: _submit,
          child: const Text('Verify'),
        ),
      ],
    );
  }
}
