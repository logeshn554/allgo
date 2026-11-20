import 'account_status.dart';

class User {
  final String id;
  final String phone;
  final String? email;
  final String? fullName;
  final String? avatarUrl;
  final AccountStatus status;
  final List<String> roles;
  final String defaultLanguage;

  const User({
    required this.id,
    required this.phone,
    this.email,
    this.fullName,
    this.avatarUrl,
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
      avatarUrl: json['avatarUrl'] as String? ?? json['avatar_url'] as String?,
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
      'avatarUrl': avatarUrl,
      'status': status.toApiString(),
      'roles': roles,
      'defaultLanguage': defaultLanguage,
    };
  }

  User copyWith({
    String? id,
    String? phone,
    String? email,
    String? fullName,
    String? avatarUrl,
    AccountStatus? status,
    List<String>? roles,
    String? defaultLanguage,
  }) {
    return User(
      id: id ?? this.id,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      fullName: fullName ?? this.fullName,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      status: status ?? this.status,
      roles: roles ?? this.roles,
      defaultLanguage: defaultLanguage ?? this.defaultLanguage,
    );
  }

  bool hasRole(String role) => roles.contains(role);
  String get phoneNumber => phone;
}

