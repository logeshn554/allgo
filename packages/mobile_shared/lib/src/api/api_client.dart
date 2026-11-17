import 'dart:typed_data';
import 'package:http/http.dart' as http;
import '../models/account_status.dart';
import '../models/user.dart';
import '../models/auth_tokens.dart';
import '../models/merchant_profile.dart';
import '../models/merchant_order.dart';
import '../models/customer_order.dart';
import '../models/product_item.dart';
import '../models/merchant_dashboard_data.dart';
import '../models/partner_profile.dart';
import '../models/merchant_outlet.dart';
import '../models/option_group.dart';
import '../models/operating_hours.dart';
import '../models/delivery_job.dart';
import '../models/mobility.dart';
import '../models/discovery.dart';
import '../models/parcel.dart';
import '../models/parcel_quote.dart';
import '../models/parcel_offer.dart';
import '../storage/token_storage.dart';
import '../data/api/base_api.dart';
import '../data/api/auth_api.dart';
import '../data/api/partner_onboarding_api.dart';
import '../data/api/merchant_onboarding_api.dart';
import '../data/api/merchant_hours_api.dart';
import '../data/api/merchant_catalog_api.dart';
import '../data/api/merchant_orders_api.dart';
import '../data/api/partner_delivery_api.dart';
import '../data/api/partner_mobility_api.dart';
import '../data/api/partner_parcel_api.dart';
import '../data/api/customer_ordering_api.dart';
import '../data/api/customer_mobility_api.dart';
import '../data/api/customer_parcel_api.dart';
import '../data/api/discovery_api.dart';
import '../data/api/finance_and_support_api.dart';

export '../data/api/base_api.dart' show ApiException;

class ApiClient {
  final String baseUrl;
  final TokenStorage tokenStorage;
  final http.Client _httpClient;
  String activeRole;
  String activeLanguage;

  late final BaseApi _baseApi;
  late final AuthApi auth;
  late final PartnerOnboardingApi partnerOnboarding;
  late final MerchantOnboardingApi merchantOnboarding;
  late final MerchantHoursApi merchantHours;
  late final MerchantCatalogApi merchantCatalog;
  late final MerchantOrdersApi merchantOrders;
  late final PartnerDeliveryApi partnerDelivery;
  late final PartnerMobilityApi partnerMobility;
  late final PartnerParcelApi partnerParcel;
  late final CustomerOrderingApi customerOrdering;
  late final CustomerMobilityApi customerMobility;
  late final CustomerParcelApi customerParcel;
  late final DiscoveryApi discovery;
  late final FinanceAndSupportApi financeSupport;

  ApiClient({
    String? baseUrl,
    TokenStorage? tokenStorage,
    http.Client? httpClient,
    this.activeRole = 'CUSTOMER',
    this.activeLanguage = 'en',
  })  : baseUrl = baseUrl ?? const String.fromEnvironment('API_BASE_URL', defaultValue: 'https://allgo-d36db.web.app'),
        tokenStorage = tokenStorage ?? SecureTokenStorage(),
        _httpClient = httpClient ?? http.Client() {
    _baseApi = BaseApi(
      baseUrl: this.baseUrl,
      tokenStorage: this.tokenStorage,
      httpClient: _httpClient,
      getActiveRole: () => activeRole,
      getActiveLanguage: () => activeLanguage,
    );
    auth = AuthApi(_baseApi);
    partnerOnboarding = PartnerOnboardingApi(_baseApi);
    merchantOnboarding = MerchantOnboardingApi(_baseApi);
    merchantHours = MerchantHoursApi(_baseApi);
    merchantCatalog = MerchantCatalogApi(_baseApi);
    merchantOrders = MerchantOrdersApi(_baseApi);
    partnerDelivery = PartnerDeliveryApi(_baseApi);
    partnerMobility = PartnerMobilityApi(_baseApi);
    partnerParcel = PartnerParcelApi(_baseApi);
    customerOrdering = CustomerOrderingApi(_baseApi);
    customerMobility = CustomerMobilityApi(_baseApi);
    customerParcel = CustomerParcelApi(_baseApi);
    discovery = DiscoveryApi(_baseApi);
    financeSupport = FinanceAndSupportApi(_baseApi);
  }

  Map<String, String> _buildHeaders({String? token, bool requiresAuth = true, String? roleContext}) {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-AllGo-Role': activeRole,
      'Accept-Language': activeLanguage,
    };
    if (requiresAuth && token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  Future<Map<String, dynamic>> sendOtp(String phone) => auth.sendOtp(phone);
  Future<AuthTokens> verifyOtp(String phone, String code, {String? platform}) => auth.verifyOtp(phone, code, platform: platform);
  Future<User> getMe() => auth.getMe();
  Future<void> logout() => auth.logout();
  Future<bool> checkHealth() => auth.checkHealth();
  Future<Map<String, dynamic>> createUploadTicket(String documentType, String mimeType, int fileSizeBytes) => partnerOnboarding.createUploadTicket(documentType, mimeType, fileSizeBytes);
  Future<Map<String, dynamic>> uploadDocumentBinary(String ticketId, List<int> bytes) => partnerOnboarding.uploadDocumentBinary(ticketId, bytes);
  Future<Map<String, dynamic>> registerPartner(Map<String, dynamic> data) => partnerOnboarding.registerPartner(data);
  Future<Map<String, dynamic>> getPartnerProfile() => partnerOnboarding.getPartnerProfile();
  Future<Map<String, dynamic>> applyPartnerService(String serviceType) => partnerOnboarding.applyPartnerService(serviceType);
  Future<Map<String, dynamic>> submitPartnerDocument(String documentType, String ticketId, {String? documentNumber}) => partnerOnboarding.submitPartnerDocument(documentType, ticketId, documentNumber: documentNumber);
  Future<Map<String, dynamic>> submitPartnerApplication() => partnerOnboarding.submitPartnerApplication();
  Future<Map<String, dynamic>> registerMerchant(Map<String, dynamic> data) => merchantOnboarding.registerMerchant(data);
  Future<Map<String, dynamic>> getMerchantProfile() => merchantOnboarding.getMerchantProfile();
  Future<Map<String, dynamic>> submitMerchantDocument(String documentType, String ticketId, {String? documentNumber}) => merchantOnboarding.submitMerchantDocument(documentType, ticketId, documentNumber: documentNumber);
  Future<Map<String, dynamic>> createMerchantOutlet(Map<String, dynamic> data) => merchantOnboarding.createMerchantOutlet(data);
  Future<List<dynamic>> getMerchantOutlets() => merchantOnboarding.getMerchantOutlets();
  Future<Map<String, dynamic>> submitMerchantApplication() => merchantOnboarding.submitMerchantApplication();
  Future<Map<String, dynamic>> getMerchantEarnings() => merchantOnboarding.getMerchantEarnings();
  Future<List<dynamic>> getMerchantPayouts() => merchantOnboarding.getMerchantPayouts();
  Future<List<OperatingHourIntervalModel>> getOutletOperatingHours(String outletId) => merchantHours.getOutletOperatingHours(outletId);
  Future<List<OperatingHourIntervalModel>> setOutletOperatingHours(String outletId, List<Map<String, dynamic>> intervals,) => merchantHours.setOutletOperatingHours(outletId, intervals);
  Future<List<SpecialClosureModel>> getOutletSpecialClosures(String outletId) => merchantHours.getOutletSpecialClosures(outletId);
  Future<SpecialClosureModel> addOutletSpecialClosure(String outletId, Map<String, dynamic> data) => merchantHours.addOutletSpecialClosure(outletId, data);
  Future<void> deleteOutletSpecialClosure(String outletId, String closureId) => merchantHours.deleteOutletSpecialClosure(outletId, closureId);
  Future<List<ProductItem>> getMerchantProducts({String? categoryId, String? search}) => merchantCatalog.getMerchantProducts(categoryId: categoryId, search: search);
  Future<ProductItem> createMerchantProduct(Map<String, dynamic> data) => merchantCatalog.createMerchantProduct(data);
  Future<void> updateMerchantProduct(String productId, Map<String, dynamic> data) => merchantCatalog.updateMerchantProduct(productId, data);
  Future<void> deleteMerchantProduct(String productId) => merchantCatalog.deleteMerchantProduct(productId);
  Future<void> updateMerchantInventory(String itemId, {int? stockQuantity, bool? isInStock}) => merchantCatalog.updateMerchantInventory(itemId, stockQuantity: stockQuantity, isInStock: isInStock);
  Future<List<dynamic>> getOutletCategories(String outletId) => merchantCatalog.getOutletCategories(outletId);
  Future<Map<String, dynamic>> createOutletCategory(String outletId, Map<String, dynamic> data) => merchantCatalog.createOutletCategory(outletId, data);
  Future<ProductItem> createOutletProduct(String outletId, Map<String, dynamic> data) => merchantCatalog.createOutletProduct(outletId, data);
  Future<ProductItem> updateCatalogProduct(String productId, Map<String, dynamic> data) => merchantCatalog.updateCatalogProduct(productId, data);
  Future<void> archiveCatalogProduct(String productId) => merchantCatalog.archiveCatalogProduct(productId);
  Future<ProductVariant> createProductVariant(String productId, Map<String, dynamic> data) => merchantCatalog.createProductVariant(productId, data);
  Future<List<ProductVariant>> getProductVariants(String productId) => merchantCatalog.getProductVariants(productId);
  Future<OptionGroup> createProductOptionGroup(String productId, Map<String, dynamic> data) => merchantCatalog.createProductOptionGroup(productId, data);
  Future<List<OptionGroup>> getProductOptionGroups(String productId) => merchantCatalog.getProductOptionGroups(productId);
  Future<OptionItem> createProductOption(String groupId, Map<String, dynamic> data) => merchantCatalog.createProductOption(groupId, data);
  Future<void> setOutletProductOverride(String outletId, String productId, Map<String, dynamic> data,) => merchantCatalog.setOutletProductOverride(outletId, productId, data);
  Future<MerchantDashboardData> getMerchantDashboard() => merchantOrders.getMerchantDashboard();
  Future<void> updateOutletStatus(String outletId, bool isOpen, {int? defaultPrepTimeMinutes}) => merchantOrders.updateOutletStatus(outletId, isOpen, defaultPrepTimeMinutes: defaultPrepTimeMinutes);
  Future<List<MerchantOrder>> getMerchantOrders({String? status}) => merchantOrders.getMerchantOrders(status: status);
  Future<MerchantOrder> getMerchantOrderById(String orderId) => merchantOrders.getMerchantOrderById(orderId);
  Future<void> updateOrderStatus(String orderId, String targetStatus, {int? prepTimeMinutes, String? rejectionReason}) => merchantOrders.updateOrderStatus(orderId, targetStatus, prepTimeMinutes: prepTimeMinutes, rejectionReason: rejectionReason);
  Future<List<DeliveryJobModel>> getMerchantDeliveryJobs(String outletId, {String? status}) => merchantOrders.getMerchantDeliveryJobs(outletId, status: status);
  Future<void> merchantAcceptDeliveryJob(String jobId) => merchantOrders.merchantAcceptDeliveryJob(jobId);
  Future<void> merchantPrepareDeliveryJob(String jobId) => merchantOrders.merchantPrepareDeliveryJob(jobId);
  Future<void> merchantReadyDeliveryJob(String jobId) => merchantOrders.merchantReadyDeliveryJob(jobId);
  Future<void> merchantVerifyHandoverOtp(String jobId, String handoverOtp) => merchantOrders.merchantVerifyHandoverOtp(jobId, handoverOtp);
  Future<List<MerchantOrder>> merchantListOrders({String? status}) => merchantOrders.merchantListOrders(status: status);
  Future<Map<String, dynamic>> merchantAcceptOrder(String subOrderId, {int prepTimeMinutes = 20}) => merchantOrders.merchantAcceptOrder(subOrderId, prepTimeMinutes: prepTimeMinutes);
  Future<Map<String, dynamic>> merchantMarkPreparing(String subOrderId) => merchantOrders.merchantMarkPreparing(subOrderId);
  Future<Map<String, dynamic>> merchantMarkReady(String subOrderId) => merchantOrders.merchantMarkReady(subOrderId);
  Future<Map<String, dynamic>> merchantRejectOrder(String subOrderId, String reason) => merchantOrders.merchantRejectOrder(subOrderId, reason);
  Future<void> partnerGoOnline(double latitude, double longitude) => partnerDelivery.partnerGoOnline(latitude, longitude);
  Future<void> partnerGoOffline() => partnerDelivery.partnerGoOffline();
  Future<void> partnerHeartbeat(double latitude, double longitude) => partnerDelivery.partnerHeartbeat(latitude, longitude);
  Future<void> partnerUpdateLocation(Map<String, dynamic> locationData) => partnerDelivery.partnerUpdateLocation(locationData);
  Future<DeliveryJobModel?> getPartnerActiveJob() => partnerDelivery.getPartnerActiveJob();
  Future<List<DeliveryOfferModel>> getPartnerOffers() => partnerDelivery.getPartnerOffers();
  Future<void> acceptPartnerOffer(String attemptId) => partnerDelivery.acceptPartnerOffer(attemptId);
  Future<void> rejectPartnerOffer(String attemptId, {String? reason}) => partnerDelivery.rejectPartnerOffer(attemptId, reason: reason);
  Future<void> partnerArrivedPickup(String jobId) => partnerDelivery.partnerArrivedPickup(jobId);
  Future<void> partnerStartDelivery(String jobId) => partnerDelivery.partnerStartDelivery(jobId);
  Future<void> partnerArrivedDestination(String jobId) => partnerDelivery.partnerArrivedDestination(jobId);
  Future<void> partnerReportException(String jobId, String exceptionType, String details) => partnerDelivery.partnerReportException(jobId, exceptionType, details);
  Future<List<PartnerEarningsModel>> getPartnerEarnings() => partnerDelivery.getPartnerEarnings();
  Future<PartnerModeConfigModel> getPartnerContinuityMode() => partnerMobility.getPartnerContinuityMode();
  Future<RideModel> driverAssignRide(String rideId) => partnerMobility.driverAssignRide(rideId);
  Future<RideModel> driverArrivedRide(String rideId) => partnerMobility.driverArrivedRide(rideId);
  Future<RideModel> driverStartTrip({required String rideId, required String startOtp}) => partnerMobility.driverStartTrip(rideId: rideId, startOtp: startOtp);
  Future<RideModel> driverCompleteTrip(String rideId) => partnerMobility.driverCompleteTrip(rideId);
  Future<List<RideOfferModel>> getPartnerRideOffers() => partnerMobility.getPartnerRideOffers();
  Future<RideModel> acceptRideOffer(String attemptId) => partnerMobility.acceptRideOffer(attemptId);
  Future<void> rejectRideOffer(String attemptId, {String? reason}) => partnerMobility.rejectRideOffer(attemptId, reason: reason);
  Future<RideModel?> getPartnerActiveRide() => partnerMobility.getPartnerActiveRide();
  Future<HireDriverBookingModel?> getPartnerActiveHireDriver() => partnerMobility.getPartnerActiveHireDriver();
  Future<ParcelModel> courierAssignParcel(String parcelId) => partnerMobility.courierAssignParcel(parcelId);
  Future<ParcelModel> courierVerifyPickupOtp({required String parcelId, required String pickupOtp}) => partnerMobility.courierVerifyPickupOtp(parcelId: parcelId, pickupOtp: pickupOtp);
  Future<ParcelModel> courierStartParcelTransit(String parcelId) => partnerMobility.courierStartParcelTransit(parcelId);
  Future<ParcelModel> courierVerifyDeliveryOtp({required String parcelId, required String deliveryOtp}) => partnerMobility.courierVerifyDeliveryOtp(parcelId: parcelId, deliveryOtp: deliveryOtp);
  Future<HireDriverBookingModel> driverAssignHireBooking(String bookingId) => partnerMobility.driverAssignHireBooking(bookingId);
  Future<HireDriverBookingModel> driverArrivedHireBooking(String bookingId) => partnerMobility.driverArrivedHireBooking(bookingId);
  Future<List<ParcelOffer>> getPartnerParcelOffers() => partnerParcel.getPartnerParcelOffers();
  Future<Map<String, dynamic>> acceptParcelOffer(String attemptId) => partnerParcel.acceptParcelOffer(attemptId);
  Future<Map<String, dynamic>> rejectParcelOffer(String attemptId, {String? reason}) => partnerParcel.rejectParcelOffer(attemptId, reason: reason);
  Future<ParcelModel?> getPartnerActiveParcel() => partnerParcel.getPartnerActiveParcel();
  Future<ParcelModel> confirmParcelArrivedPickup(String parcelId) => partnerParcel.confirmParcelArrivedPickup(parcelId);
  Future<ParcelModel> verifyParcelPickupOtp(String parcelId, String otp) => partnerParcel.verifyParcelPickupOtp(parcelId, otp);
  Future<ParcelModel> startParcelTransit(String parcelId) => partnerParcel.startParcelTransit(parcelId);
  Future<ParcelModel> confirmParcelArrivedDestination(String parcelId) => partnerParcel.confirmParcelArrivedDestination(parcelId);
  Future<ParcelModel> verifyParcelDeliveryOtp(String parcelId, String otp, {String? photoUrl}) => partnerParcel.verifyParcelDeliveryOtp(parcelId, otp, photoUrl: photoUrl);
  Future<ParcelModel> completeParcelReturn(String parcelId) => partnerParcel.completeParcelReturn(parcelId);
  Future<List<ParcelModel>> getPartnerParcelHistory({int limit = 20, int offset = 0}) => partnerParcel.getPartnerParcelHistory(limit: limit, offset: offset);
  Future<List<DeliveryJobModel>> getCustomerActiveDeliveries() => customerOrdering.getCustomerActiveDeliveries();
  Future<DeliveryJobModel> getCustomerDeliveryTracking(String jobId) => customerOrdering.getCustomerDeliveryTracking(jobId);
  Future<CartModel> getCart() => customerOrdering.getCart();
  Future<CartModel> updateCartItemQuantity(String cartItemId, int quantity) => customerOrdering.updateCartItemQuantity(cartItemId, quantity);
  Future<CartModel> removeCartItem(String cartItemId) => customerOrdering.removeCartItem(cartItemId);
  Future<CartModel> clearCart() => customerOrdering.clearCart();
  Future<List<CustomerOrderDetail>> listCustomerOrders() => customerOrdering.listCustomerOrders();
  Future<CustomerOrderDetail> getCustomerOrderDetail(String subOrderId) => customerOrdering.getCustomerOrderDetail(subOrderId);
  Future<Map<String, dynamic>> cancelCustomerOrder(String subOrderId, String reason) => customerOrdering.cancelCustomerOrder(subOrderId, reason);
  Future<List<CustomerAddressModel>> listCustomerAddresses() => customerOrdering.listCustomerAddresses();
  Future<CustomerAddressModel> createCustomerAddress(CustomerAddressModel address) => customerOrdering.createCustomerAddress(address);
  Future<void> deleteCustomerAddress(String addressId) => customerOrdering.deleteCustomerAddress(addressId);
  Future<RideModel> getRide(String rideId) => customerMobility.getRide(rideId);
  Future<void> cancelRide({required String rideId, String? reason}) => customerMobility.cancelRide(rideId: rideId, reason: reason);
  Future<ParcelModel> getParcel(String parcelId) => customerMobility.getParcel(parcelId);
  Future<HireDriverBookingModel> getHireDriverBooking(String bookingId) => customerMobility.getHireDriverBooking(bookingId);
  Future<ParcelQuote> quoteParcel(Map<String, dynamic> quoteRequest) => customerParcel.quoteParcel(quoteRequest);
  Future<List<Map<String, dynamic>>> getParcelRestrictions() => customerParcel.getParcelRestrictions();
  Future<List<Map<String, dynamic>>> getParcelServices() => customerParcel.getParcelServices();
  Future<ParcelModel> createParcelBooking(Map<String, dynamic> bookingRequest) => customerParcel.createParcelBooking(bookingRequest);
  Future<ParcelModel> getParcelDetails(String parcelId) => customerParcel.getParcelDetails(parcelId);
  Future<ParcelModel> getParcelTracking(String parcelId) => customerParcel.getParcelTracking(parcelId);
  Future<List<ParcelModel>> listCustomerParcels({int limit = 20, int offset = 0, String? status}) => customerParcel.listCustomerParcels(limit: limit, offset: offset, status: status);
  Future<ParcelModel> cancelParcelBooking(String parcelId, {required String reason}) => customerParcel.cancelParcelBooking(parcelId, reason: reason);
  Future<Map<String, dynamic>> getCustomerOutletDetails(String outletId) => discovery.getCustomerOutletDetails(outletId);
  Future<OutletOpenStatusModel> getCustomerOutletStatus(String outletId) => discovery.getCustomerOutletStatus(outletId);
  Future<List<dynamic>> getCustomerOutletCategories(String outletId) => discovery.getCustomerOutletCategories(outletId);
  Future<ProductItem> getCustomerProductDetails(String productId, {String? outletId}) => discovery.getCustomerProductDetails(productId, outletId: outletId);
  Future<List<SearchSuggestion>> getSearchSuggestions(String query, {String? verticalType}) => discovery.getSearchSuggestions(query, verticalType: verticalType);
  Future<List<DiscoveryCategory>> listCategories({String? verticalType}) => discovery.listCategories(verticalType: verticalType);
  Future<List<EligiblePromotion>> listEligiblePromotions() => discovery.listEligiblePromotions();
  Future<Map<String, dynamic>> getCustomerWallet() => financeSupport.getCustomerWallet();
  Future<Map<String, dynamic>> topupCustomerWallet(double amountInr) => financeSupport.topupCustomerWallet(amountInr);
  Future<List<dynamic>> getCustomerWalletTransactions() => financeSupport.getCustomerWalletTransactions();
  Future<List<dynamic>> getCustomerPayments() => financeSupport.getCustomerPayments();
  Future<List<dynamic>> getCustomerRefunds() => financeSupport.getCustomerRefunds();
  Future<Map<String, dynamic>> submitRating(Map<String, dynamic> ratingData) => financeSupport.submitRating(ratingData);
  Future<Map<String, dynamic>> getRatings(String targetType, String targetId) => financeSupport.getRatings(targetType, targetId);
  Future<Map<String, dynamic>> createSupportTicket(Map<String, dynamic> ticketData, {String role = 'CUSTOMER'}) => financeSupport.createSupportTicket(ticketData, role: role);
  Future<List<dynamic>> getUserSupportTickets({String role = 'CUSTOMER'}) => financeSupport.getUserSupportTickets(role: role);
  Future<Map<String, dynamic>> getSupportTicketDetails(String ticketId, {String role = 'CUSTOMER'}) => financeSupport.getSupportTicketDetails(ticketId, role: role);
  Future<Map<String, dynamic>> addSupportTicketMessage(String ticketId, String message, {String role = 'CUSTOMER', bool isInternal = false}) => financeSupport.addSupportTicketMessage(ticketId, message, role: role, isInternal: isInternal);
  Future<Map<String, dynamic>> getNotifications({String role = 'CUSTOMER', bool unreadOnly = false}) => financeSupport.getNotifications(role: role, unreadOnly: unreadOnly);
  Future<void> markNotificationRead(String notificationId, {String role = 'CUSTOMER'}) => financeSupport.markNotificationRead(notificationId, role: role);
  Future<void> markAllNotificationsRead({String role = 'CUSTOMER'}) => financeSupport.markAllNotificationsRead(role: role);
  Future<Map<String, dynamic>> getPartnerEarningsDashboard() => financeSupport.getPartnerEarningsDashboard();
  Future<List<dynamic>> getPartnerSettlements() => financeSupport.getPartnerSettlements();
  Future<Map<String, dynamic>> getPartnerCodStatus() => financeSupport.getPartnerCodStatus();
  Future<Map<String, dynamic>> submitPartnerCodDeposit(double amountInr, String depositReference, {String? notes}) => financeSupport.submitPartnerCodDeposit(amountInr, depositReference, notes: notes);
  Future<Map<String, dynamic>> getMerchantFinancialOverview() => financeSupport.getMerchantFinancialOverview();
  Future<List<dynamic>> getMerchantSettlements() => financeSupport.getMerchantSettlements();
}