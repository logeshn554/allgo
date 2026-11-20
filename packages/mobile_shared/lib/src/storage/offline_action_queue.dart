import 'dart:async';
import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

enum OfflineActionStatus { PENDING, PROCESSING, COMPLETED, FAILED }

class OfflineAction {
  final String id;
  final String type;
  final String path;
  final String method;
  final Map<String, dynamic> payload;
  final int timestampMs;
  final int retryCount;
  final OfflineActionStatus status;

  const OfflineAction({
    required this.id,
    required this.type,
    required this.path,
    required this.method,
    required this.payload,
    required this.timestampMs,
    this.retryCount = 0,
    this.status = OfflineActionStatus.PENDING,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        'path': path,
        'method': method,
        'payload': payload,
        'timestampMs': timestampMs,
        'retryCount': retryCount,
        'status': status.name,
      };

  factory OfflineAction.fromJson(Map<String, dynamic> json) => OfflineAction(
        id: json['id'] as String,
        type: json['type'] as String,
        path: json['path'] as String,
        method: json['method'] as String? ?? 'POST',
        payload: (json['payload'] as Map<String, dynamic>?) ?? {},
        timestampMs: (json['timestampMs'] as num).toInt(),
        retryCount: (json['retryCount'] as num?)?.toInt() ?? 0,
        status: OfflineActionStatus.values.byName(json['status'] as String? ?? 'PENDING'),
      );

  OfflineAction copyWith({
    int? retryCount,
    OfflineActionStatus? status,
  }) =>
      OfflineAction(
        id: id,
        type: type,
        path: path,
        method: method,
        payload: payload,
        timestampMs: timestampMs,
        retryCount: retryCount ?? this.retryCount,
        status: status ?? this.status,
      );
}

class OfflineActionQueue {
  static const String _storageKey = 'allgo_offline_actions_queue';
  final FlutterSecureStorage _storage;
  final List<OfflineAction> _inMemoryQueue = [];
  bool _isProcessing = false;

  OfflineActionQueue({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  List<OfflineAction> get queuedActions => List.unmodifiable(_inMemoryQueue);
  int get length => _inMemoryQueue.length;

  Future<void> initialize() async {
    try {
      final raw = await _storage.read(key: _storageKey);
      if (raw != null) {
        final list = jsonDecode(raw) as List<dynamic>;
        _inMemoryQueue.clear();
        for (final item in list) {
          _inMemoryQueue.add(OfflineAction.fromJson(item as Map<String, dynamic>));
        }
      }
    } catch (_) {}
  }

  Future<void> enqueue(OfflineAction action) async {
    _inMemoryQueue.add(action);
    await _persist();
  }

  Future<void> remove(String actionId) async {
    _inMemoryQueue.removeWhere((a) => a.id == actionId);
    await _persist();
  }

  Future<void> clear() async {
    _inMemoryQueue.clear();
    await _persist();
  }

  Future<int> flushQueue(Future<bool> Function(OfflineAction action) executor) async {
    if (_isProcessing || _inMemoryQueue.isEmpty) return 0;
    _isProcessing = true;
    int executedCount = 0;

    final pending = List<OfflineAction>.from(_inMemoryQueue);
    for (final action in pending) {
      try {
        final success = await executor(action);
        if (success) {
          _inMemoryQueue.removeWhere((a) => a.id == action.id);
          executedCount++;
        } else {
          _incrementRetry(action.id);
        }
      } catch (_) {
        _incrementRetry(action.id);
      }
    }

    await _persist();
    _isProcessing = false;
    return executedCount;
  }

  void _incrementRetry(String actionId) {
    final idx = _inMemoryQueue.indexWhere((a) => a.id == actionId);
    if (idx != -1) {
      final curr = _inMemoryQueue[idx];
      if (curr.retryCount >= 5) {
        // Discard after 5 persistent failures to avoid poison pills
        _inMemoryQueue.removeAt(idx);
      } else {
        _inMemoryQueue[idx] = curr.copyWith(retryCount: curr.retryCount + 1);
      }
    }
  }

  Future<void> _persist() async {
    try {
      final data = jsonEncode(_inMemoryQueue.map((a) => a.toJson()).toList());
      await _storage.write(key: _storageKey, value: data);
    } catch (_) {}
  }
}
