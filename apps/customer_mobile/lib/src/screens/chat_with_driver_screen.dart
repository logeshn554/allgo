import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class ChatMessage {
  final String id;
  final String text;
  final bool isFromCustomer;
  final DateTime timestamp;

  const ChatMessage({
    required this.id,
    required this.text,
    required this.isFromCustomer,
    required this.timestamp,
  });
}

class ChatWithDriverScreen extends ConsumerStatefulWidget {
  final String driverName;
  final String? driverPhone;
  final String orderId;

  const ChatWithDriverScreen({
    super.key,
    required this.driverName,
    this.driverPhone,
    required this.orderId,
  });

  @override
  ConsumerState<ChatWithDriverScreen> createState() => _ChatWithDriverScreenState();
}

class _ChatWithDriverScreenState extends ConsumerState<ChatWithDriverScreen> {
  final TextEditingController _msgCtrl = TextEditingController();
  final List<ChatMessage> _messages = [];
  RealtimeSocketService? _socket;
  bool _isConnected = false;

  static const List<String> quickReplies = [
    'I am waiting at the gate.',
    'Please leave it at the door.',
    'Please call before ringing bell.',
    'Take the elevator to 3rd floor.',
  ];

  @override
  void initState() {
    super.initState();
    _connectChatSocket();
  }

  Future<void> _connectChatSocket() async {
    final socket = ref.read(realtimeSocketServiceProvider);
    _socket = socket;
    await socket.connect();
    socket.subscribeOrder(widget.orderId);
    socket.on('order:chat_message', (payload) {
      if (!mounted || payload is! Map) return;
      final incomingOrderId = payload['orderId']?.toString();
      if (incomingOrderId != null && incomingOrderId != widget.orderId) return;
      final text = payload['text']?.toString() ?? '';
      final senderRole = payload['senderRole']?.toString() ?? 'PARTNER';
      if (text.isEmpty || senderRole == 'CUSTOMER') return;
      setState(() {
        _messages.add(
          ChatMessage(
            id: payload['id']?.toString() ?? 'srv-${DateTime.now().millisecondsSinceEpoch}',
            text: text,
            isFromCustomer: false,
            timestamp: DateTime.now(),
          ),
        );
      });
    });
    if (mounted) setState(() => _isConnected = true);
  }

  @override
  void dispose() {
    _socket?.off('order:chat_message');
    _socket?.unsubscribeOrder(widget.orderId);
    _msgCtrl.dispose();
    super.dispose();
  }

  Future<void> _callDriver() async {
    final phone = widget.driverPhone?.trim() ?? '';
    if (phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Driver phone number is not available yet.')),
      );
      return;
    }
    final uri = Uri(scheme: 'tel', path: phone);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  void _sendMessage(String text) {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return;

    final msg = ChatMessage(
      id: 'm-${DateTime.now().millisecondsSinceEpoch}',
      text: trimmed,
      isFromCustomer: true,
      timestamp: DateTime.now(),
    );
    setState(() {
      _messages.add(msg);
      _msgCtrl.clear();
    });

    _socket?.emit('order:chat_message', {
      'orderId': widget.orderId,
      'senderRole': 'CUSTOMER',
      'text': trimmed,
      'sentAt': msg.timestamp.toIso8601String(),
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.driverName, style: const TextStyle(fontSize: 16)),
            Text(
              _isConnected ? 'Delivery Partner • Live channel connected' : 'Connecting to delivery channel...',
              style: TextStyle(fontSize: 11, color: _isConnected ? Colors.green : Colors.orange),
            ),
          ],
        ),
        actions: [
          if (widget.driverPhone != null && widget.driverPhone!.trim().isNotEmpty)
            IconButton(
              icon: const Icon(Icons.call_outlined),
              tooltip: 'Call Partner',
              onPressed: _callDriver,
            ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _messages.isEmpty
                ? const Center(
                    child: Padding(
                      padding: EdgeInsets.all(24),
                      child: Text(
                        'Send delivery instructions or tap a quick reply below to message your partner.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: AllGoColors.textSecondary),
                      ),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length,
                    itemBuilder: (context, index) {
                      final msg = _messages[index];
                      return Align(
                        alignment: msg.isFromCustomer ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                          decoration: BoxDecoration(
                            color: msg.isFromCustomer ? AllGoColors.primary : Theme.of(context).cardColor,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: msg.isFromCustomer ? AllGoColors.primary : Theme.of(context).dividerColor,
                            ),
                          ),
                          child: Text(
                            msg.text,
                            style: TextStyle(
                              color: msg.isFromCustomer ? Colors.white : AllGoColors.textPrimary,
                              fontSize: 14,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
          Container(
            height: 38,
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: quickReplies.length,
              separatorBuilder: (_, __) => const SizedBox(width: 6),
              itemBuilder: (context, i) {
                final reply = quickReplies[i];
                return ActionChip(
                  label: Text(reply, style: const TextStyle(fontSize: 11)),
                  onPressed: () => _sendMessage(reply),
                );
              },
            ),
          ),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            color: Theme.of(context).cardColor,
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _msgCtrl,
                    decoration: const InputDecoration(
                      hintText: 'Type a message to your partner...',
                      contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    ),
                    onSubmitted: _sendMessage,
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.send, color: AllGoColors.primary),
                  tooltip: 'Send message',
                  onPressed: () => _sendMessage(_msgCtrl.text),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
