import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class PartnerJobActions {
  final ApiClient client;
  final void Function(String message) onError;
  final void Function() onSuccess;

  PartnerJobActions({
    required this.client,
    required this.onError,
    required this.onSuccess,
  });

  Future<void> acceptOffer(String attemptId) async {
    try {
      await client.acceptPartnerOffer(attemptId);
      onSuccess();
    } catch (e) {
      onError('Failed to accept offer: $e');
    }
  }

  Future<void> rejectOffer(String attemptId) async {
    try {
      await client.rejectPartnerOffer(attemptId, reason: 'Partner declined offer');
      onSuccess();
    } catch (e) {
      onError('Failed to reject offer: $e');
    }
  }

  Future<void> arrivedPickup(String jobId) async {
    try {
      await client.partnerArrivedPickup(jobId);
      onSuccess();
    } catch (e) {
      onError('Action failed: $e');
    }
  }

  Future<void> startDelivery(String jobId) async {
    try {
      await client.partnerStartDelivery(jobId);
      onSuccess();
    } catch (e) {
      onError('Action failed: $e');
    }
  }

  Future<void> arrivedDestination(String jobId) async {
    try {
      await client.partnerArrivedDestination(jobId);
      onSuccess();
    } catch (e) {
      onError('Action failed: $e');
    }
  }

  Future<void> completeDelivery(String jobId, String otp) async {
    try {
      await client.partnerCompleteDelivery(jobId, handoverOtp: otp);
      onSuccess();
    } catch (e) {
      onError('Completion failed: $e');
    }
  }

  Future<void> acceptParcelOffer(String attemptId) async {
    try {
      await client.acceptParcelOffer(attemptId);
      onSuccess();
    } catch (e) {
      onError('Failed to accept parcel offer: $e');
    }
  }

  Future<void> rejectParcelOffer(String attemptId) async {
    try {
      await client.rejectParcelOffer(attemptId, reason: 'Courier busy');
      onSuccess();
    } catch (e) {
      onError('Failed to reject parcel offer: $e');
    }
  }

  Future<void> confirmParcelArrivedPickup(String parcelId) async {
    try {
      await client.confirmParcelArrivedPickup(parcelId);
      onSuccess();
    } catch (e) {
      onError('Action failed: $e');
    }
  }

  Future<void> verifyParcelPickupOtp(String parcelId, String otp) async {
    try {
      await client.verifyParcelPickupOtp(parcelId, otp);
      onSuccess();
    } catch (e) {
      onError('OTP failed: $e');
    }
  }

  Future<void> startParcelTransit(String parcelId) async {
    try {
      await client.startParcelTransit(parcelId);
      onSuccess();
    } catch (e) {
      onError('Transit failed: $e');
    }
  }

  Future<void> confirmParcelArrivedDestination(String parcelId) async {
    try {
      await client.confirmParcelArrivedDestination(parcelId);
      onSuccess();
    } catch (e) {
      onError('Action failed: $e');
    }
  }

  Future<void> verifyParcelDeliveryOtp(String parcelId, String otp) async {
    try {
      await client.verifyParcelDeliveryOtp(parcelId, otp);
      onSuccess();
    } catch (e) {
      onError('Delivery OTP failed: $e');
    }
  }

  Future<void> acceptRideOffer(String attemptId) async {
    try {
      await client.acceptRideOffer(attemptId);
      onSuccess();
    } catch (e) {
      onError('Ride accept failed: $e');
    }
  }

  Future<void> rejectRideOffer(String attemptId) async {
    try {
      await client.rejectRideOffer(attemptId, reason: 'Driver unavailable');
      onSuccess();
    } catch (e) {
      onError('Ride reject failed: $e');
    }
  }

  Future<void> driverArrivedRide(String rideId) async {
    try {
      await client.driverArrivedRide(rideId);
      onSuccess();
    } catch (e) {
      onError('Arrived failed: $e');
    }
  }

  Future<void> driverStartTrip(String rideId, String otp) async {
    try {
      await client.driverStartTrip(rideId, otp: otp);
      onSuccess();
    } catch (e) {
      onError('Start trip failed: $e');
    }
  }

  Future<void> driverCompleteTrip(String rideId) async {
    try {
      await client.driverCompleteTrip(rideId);
      onSuccess();
    } catch (e) {
      onError('Complete trip failed: $e');
    }
  }
}
