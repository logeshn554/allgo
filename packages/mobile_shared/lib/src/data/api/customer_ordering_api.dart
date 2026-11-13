import 'dart:convert';
import 'package:http/http.dart' as http;
import 'base_api.dart';
import '../../models/customer_order.dart';
import '../../models/delivery_job.dart';

class CustomerOrderingApi {
  final BaseApi base;
  CustomerOrderingApi(this.base);

  Future<List<DeliveryJobModel>> getCustomerActiveDeliveries() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/customer/delivery/active');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final list = res as List<dynamic>? ?? [];
      return list.map((e) => DeliveryJobModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to fetch customer deliveries');
  }

  Future<DeliveryJobModel> getCustomerDeliveryTracking(String jobId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/customer/delivery/jobs/$jobId/tracking');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return DeliveryJobModel.fromJson(res as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to fetch delivery tracking');
  }

  Future<CartModel> getCart() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/cart');
    final response = await base.httpClient.get(url, headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'));
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return CartModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to fetch cart');
  }

  Future<CartModel> addToCart({
    required String outletId,
    required String itemId,
    int quantity = 1,
    String? variantId,
    List<Map<String, dynamic>>? selectedOptions,
    String? specialInstructions,
    bool replaceOutlet = false,
  }) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/cart/items');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
      body: jsonEncode({
        'outletId': outletId,
        'itemId': itemId,
        'quantity': quantity,
        if (variantId != null) 'variantId': variantId,
        if (selectedOptions != null) 'selectedOptions': selectedOptions,
        if (specialInstructions != null) 'specialInstructions': specialInstructions,
        'replaceOutlet': replaceOutlet,
      }),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return CartModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to add item to cart', data['error']?.toString());
  }

  Future<CartModel> updateCartItemQuantity(String cartItemId, int quantity) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/cart/items/$cartItemId');
    final response = await base.httpClient.patch(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
      body: jsonEncode({'quantity': quantity}),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return CartModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to update cart item');
  }

  Future<CartModel> removeCartItem(String cartItemId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/cart/items/$cartItemId');
    final response = await base.httpClient.delete(url, headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'));
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return CartModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to remove cart item');
  }

  Future<CartModel> clearCart() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/cart');
    final response = await base.httpClient.delete(url, headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'));
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return CartModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to clear cart');
  }

  Future<CartPricingModel> getCheckoutEstimate({
    required String outletId,
    required List<Map<String, dynamic>> items,
    Map<String, dynamic>? customerLocation,
    String? couponCode,
  }) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/checkout/estimate');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
      body: jsonEncode({
        'outletId': outletId,
        'items': items,
        if (customerLocation != null) 'customerLocation': customerLocation,
        if (couponCode != null) 'couponCode': couponCode,
      }),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return CartPricingModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to calculate checkout estimate');
  }

  Future<Map<String, dynamic>> placeOrder({
    required String deliveryAddressId,
    String paymentMethod = 'COD',
    String? couponCode,
    String? deliveryInstructions,
    String? customerNotes,
    String? idempotencyKey,
  }) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/orders/place');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
      body: jsonEncode({
        'deliveryAddressId': deliveryAddressId,
        'paymentMethod': paymentMethod,
        if (couponCode != null) 'couponCode': couponCode,
        if (deliveryInstructions != null) 'deliveryInstructions': deliveryInstructions,
        if (customerNotes != null) 'customerNotes': customerNotes,
        if (idempotencyKey != null) 'idempotencyKey': idempotencyKey,
      }),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to place order');
  }

  Future<List<CustomerOrderDetail>> listCustomerOrders() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/orders');
    final response = await base.httpClient.get(url, headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'));
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final list = data as List<dynamic>? ?? [];
      return list.map((item) => CustomerOrderDetail.fromJson(item as Map<String, dynamic>)).toList();
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to list customer orders');
  }

  Future<CustomerOrderDetail> getCustomerOrderDetail(String subOrderId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/orders/$subOrderId');
    final response = await base.httpClient.get(url, headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'));
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return CustomerOrderDetail.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to fetch order details');
  }

  Future<Map<String, dynamic>> cancelCustomerOrder(String subOrderId, String reason) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/orders/$subOrderId/cancel');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
      body: jsonEncode({'reason': reason}),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to cancel order');
  }

  Future<List<CustomerAddressModel>> listCustomerAddresses() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/addresses');
    final response = await base.httpClient.get(url, headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'));
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final list = data as List<dynamic>? ?? [];
      return list.map((a) => CustomerAddressModel.fromJson(a as Map<String, dynamic>)).toList();
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to fetch saved addresses');
  }

  Future<CustomerAddressModel> createCustomerAddress(CustomerAddressModel address) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/addresses');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
      body: jsonEncode(address.toJson()),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return CustomerAddressModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to create saved address');
  }

  Future<void> deleteCustomerAddress(String addressId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/addresses/$addressId');
    final response = await base.httpClient.delete(url, headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'));
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return;
    }
    final data = jsonDecode(response.body);
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to delete saved address');
  }

}