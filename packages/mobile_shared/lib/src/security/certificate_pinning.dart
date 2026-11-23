import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:http/http.dart' as http;
import 'package:http/io_client.dart';

class CertificatePinningConfig {
  static const List<String> trustedSha256Fingerprints = [
    '2386E803108E12A1F70AE1180AA0B1F4F9D7886470876189ED8FE9D2EB586948',
    '3F3C6415DE802C4E3FD4E36C9543D6FA009C7D52B7706F79F9C3E566735EAF7D',
  ];

  static http.Client createPinnedHttpClient({bool enablePinning = true}) {
    if (!enablePinning) {
      return http.Client();
    }

    final securityContext = SecurityContext(withTrustedRoots: true);
    final httpClient = HttpClient(context: securityContext)
      ..badCertificateCallback = (X509Certificate cert, String host, int port) {
        if (host.contains('localhost') || host.contains('10.0.2.2')) {
          return true; // Allow local emulators in debug mode
        }
        final certSha256 = sha256.convert(cert.der).toString().toUpperCase();
        return trustedSha256Fingerprints.contains(certSha256);
      };

    return IOClient(httpClient);
  }
}
