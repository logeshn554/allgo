enum AccountStatus {
  active,
  suspended,
  blocked,
  pendingVerification;

  static AccountStatus fromString(String val) {
    switch (val.toUpperCase()) {
      case 'ACTIVE':
        return AccountStatus.active;
      case 'SUSPENDED':
        return AccountStatus.suspended;
      case 'BLOCKED':
        return AccountStatus.blocked;
      case 'PENDING_VERIFICATION':
      default:
        return AccountStatus.pendingVerification;
    }
  }

  String toApiString() {
    switch (this) {
      case AccountStatus.active:
        return 'ACTIVE';
      case AccountStatus.suspended:
        return 'SUSPENDED';
      case AccountStatus.blocked:
        return 'BLOCKED';
      case AccountStatus.pendingVerification:
        return 'PENDING_VERIFICATION';
    }
  }
}

