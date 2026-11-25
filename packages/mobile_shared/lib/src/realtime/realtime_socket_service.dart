import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../storage/token_storage.dart';

class RealtimeSocketService {
  final String baseUrl;
  final TokenStorage tokenStorage;

  io.Socket? _socket;
  bool _isConnected = false;

  final _locationController = StreamController<Map<String, dynamic>>.broadcast();
  final _statusController = StreamController<Map<String, dynamic>>.broadcast();
  final _offerController = StreamController<Map<String, dynamic>>.broadcast();
  final _substitutionController = StreamController<Map<String, dynamic>>.broadcast();
  final _connectionController = StreamController<bool>.broadcast();

  RealtimeSocketService({
    required this.baseUrl,
    required this.tokenStorage,
  });

  bool get isConnected => _isConnected;
  Stream<Map<String, dynamic>> get onLocationUpdate => _locationController.stream;
  Stream<Map<String, dynamic>> get onStatusChanged => _statusController.stream;
  Stream<Map<String, dynamic>> get onOfferReceived => _offerController.stream;
  Stream<Map<String, dynamic>> get onSubstitutionProposed => _substitutionController.stream;
  Stream<bool> get onConnectionChanged => _connectionController.stream;

  Future<void> connect() async {
    if (_socket != null && _isConnected) return;
    final token = await tokenStorage.getAccessToken();
    if (token == null || token.isEmpty) return;

    final cleanBase = baseUrl.replaceAll(RegExp(r'/+$'), '');
    final socket = io.io(
      '$cleanBase/delivery',
      io.OptionBuilder()
          .setTransports(['websocket'])
          .enableAutoConnect()
          .enableReconnection()
          .setAuth({'token': token})
          .build(),
    );

    socket.onConnect((_) {
      _isConnected = true;
      if (!_connectionController.isClosed) _connectionController.add(true);
    });

    socket.onDisconnect((_) {
      _isConnected = false;
      if (!_connectionController.isClosed) _connectionController.add(false);
    });

    socket.on('driver:location', (data) {
      if (data is Map && !_locationController.isClosed) {
        _locationController.add(Map<String, dynamic>.from(data));
      }
    });

    socket.on('job:status', (data) {
      if (data is Map && !_statusController.isClosed) {
        _statusController.add(Map<String, dynamic>.from(data));
      }
    });

    socket.on('order:status', (data) {
      if (data is Map && !_statusController.isClosed) {
        _statusController.add(Map<String, dynamic>.from(data));
      }
    });

    socket.on('dispatch:offer', (data) {
      if (data is Map && !_offerController.isClosed) {
        _offerController.add(Map<String, dynamic>.from(data));
      }
    });

    socket.on('order:substitution', (data) {
      if (data is Map && !_substitutionController.isClosed) {
        _substitutionController.add(Map<String, dynamic>.from(data));
      }
    });

    _socket = socket;
    socket.connect();
  }

  void subscribeJob(String jobId) {
    _socket?.emit('job:subscribe', {'jobId': jobId});
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
  }

  void dispose() {
    disconnect();
    _locationController.close();
    _statusController.close();
    _offerController.close();
    _substitutionController.close();
    _connectionController.close();
  }
}
