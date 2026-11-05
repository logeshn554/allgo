import 'account_status.dart';

class User {
  final String id;
  final String phone;
  final String? email;
  final String? fullName;
  final AccountStatus status;
  final List<String> roles;
  final String defaultLanguage;

  const User({
    required this.id,
    required this.phone,
    this.email,
    this.fullName,
    required this.status,
    required this.roles,
    required this.defaultLanguage,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      phone: json['phone'] as String,
      email: json['email'] as String?,
      fullName: json['fullName'] as String? ?? json['full_name'] as String?,
      status: AccountStatus.fromString(json['status'] as String? ?? 'ACTIVE'),
      roles: (json['roles'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? ['CUSTOMER'],
      defaultLanguage: json['defaultLanguage'] as String? ?? json['default_language'] as String? ?? 'en',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'phone': phone,
      'email': email,
      'fullName': fullName,
      'status': status.toApiString(),
      'roles': roles,
      'defaultLanguage': defaultLanguage,
    };
  }

  bool hasRole(String role) => roles.contains(role);
}
