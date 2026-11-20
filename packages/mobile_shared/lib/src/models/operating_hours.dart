class OperatingHourIntervalModel {
  final String? id;
  final String? outletId;
  final int dayOfWeek; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  final String openTime;
  final String closeTime;
  final int slotIndex;
  final bool isOvernight;
  final bool isClosed;

  const OperatingHourIntervalModel({
    this.id,
    this.outletId,
    required this.dayOfWeek,
    required this.openTime,
    required this.closeTime,
    this.slotIndex = 0,
    this.isOvernight = false,
    this.isClosed = false,
  });

  factory OperatingHourIntervalModel.fromJson(Map<String, dynamic> json) {
    return OperatingHourIntervalModel(
      id: json['id'] as String?,
      outletId: json['outletId'] as String? ?? json['outlet_id'] as String?,
      dayOfWeek: (json['dayOfWeek'] as num?)?.toInt() ?? (json['day_of_week'] as num?)?.toInt() ?? 0,
      openTime: json['openTime'] as String? ?? json['open_time'] as String? ?? '09:00:00',
      closeTime: json['closeTime'] as String? ?? json['close_time'] as String? ?? '22:00:00',
      slotIndex: (json['slotIndex'] as num?)?.toInt() ?? (json['slot_index'] as num?)?.toInt() ?? 0,
      isOvernight: json['isOvernight'] as bool? ?? json['is_overnight'] as bool? ?? false,
      isClosed: json['isClosed'] as bool? ?? json['is_closed'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
    if (id != null) 'id': id,
    if (outletId != null) 'outletId': outletId,
    'dayOfWeek': dayOfWeek,
    'openTime': openTime,
    'closeTime': closeTime,
    'slotIndex': slotIndex,
    'isOvernight': isOvernight,
    'isClosed': isClosed,
  };

  String get dayName {
    switch (dayOfWeek) {
      case 0: return 'Sunday';
      case 1: return 'Monday';
      case 2: return 'Tuesday';
      case 3: return 'Wednesday';
      case 4: return 'Thursday';
      case 5: return 'Friday';
      case 6: return 'Saturday';
      default: return 'Day $dayOfWeek';
    }
  }
}

class SpecialClosureModel {
  final String? id;
  final String closureDate;
  final String? reason;
  final bool isFullDay;
  final String? openTime;
  final String? closeTime;

  String get startDate => closureDate;
  String get endDate => closureDate;

  const SpecialClosureModel({
    this.id,
    required this.closureDate,
    this.reason,
    this.isFullDay = true,
    this.openTime,
    this.closeTime,
  });

  factory SpecialClosureModel.fromJson(Map<String, dynamic> json) {
    return SpecialClosureModel(
      id: json['id'] as String?,
      closureDate: json['closureDate'] as String? ?? json['closure_date'] as String? ?? '',
      reason: json['reason'] as String?,
      isFullDay: json['isFullDay'] as bool? ?? json['is_full_day'] as bool? ?? true,
      openTime: json['openTime'] as String? ?? json['open_time'] as String?,
      closeTime: json['closeTime'] as String? ?? json['close_time'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'closureDate': closureDate,
    'reason': reason,
    'isFullDay': isFullDay,
    'openTime': openTime,
    'closeTime': closeTime,
  };
}

class OutletOpenStatusModel {
  final bool isOpen;
  final String? reason;
  final String? details;
  final String timezone;
  final OperatingHourIntervalModel? currentInterval;

  const OutletOpenStatusModel({
    required this.isOpen,
    this.reason,
    this.details,
    required this.timezone,
    this.currentInterval,
  });

  factory OutletOpenStatusModel.fromJson(Map<String, dynamic> json) {
    return OutletOpenStatusModel(
      isOpen: json['isOpen'] as bool? ?? false,
      reason: json['reason'] as String?,
      details: json['details'] as String?,
      timezone: json['timezone'] as String? ?? 'Asia/Kolkata',
      currentInterval: json['currentInterval'] != null
          ? OperatingHourIntervalModel.fromJson(json['currentInterval'] as Map<String, dynamic>)
          : null,
    );
  }
}
