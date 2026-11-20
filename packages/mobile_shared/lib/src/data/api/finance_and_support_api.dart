import 'dart:convert';
import 'package:http/http.dart' as http;
import 'base_api.dart';

class FinanceAndSupportApi {
  final BaseApi base;
  FinanceAndSupportApi(this.base);

  Future<Map<String, dynamic>> getCustomerWallet() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/customer/wallet');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to fetch wallet');
  }

  Future<Map<String, dynamic>> topupCustomerWallet(double amountInr) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/customer/wallet/topup');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
      body: jsonEncode({'amountInr': amountInr}),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to top up wallet');
  }

  Future<List<dynamic>> getCustomerWalletTransactions() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/customer/wallet/transactions');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data as List<dynamic>;
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to fetch wallet transactions');
  }

  Future<List<dynamic>> getCustomerPayments() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/customer/payments');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data as List<dynamic>;
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to fetch customer payments');
  }

  Future<List<dynamic>> getCustomerRefunds() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/customer/refunds');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data as List<dynamic>;
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to fetch customer refunds');
  }

  Future<Map<String, dynamic>> submitRating(Map<String, dynamic> ratingData) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/ratings');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
      body: jsonEncode(ratingData),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to submit rating');
  }

  Future<Map<String, dynamic>> getRatings(String targetType, String targetId) async {
    final token = await base.tokenStorage.getAccessToken();
    final queryParams = {'targetType': targetType, 'targetId': targetId};
    final url = Uri.parse('${base.base.baseUrl}/v1/ratings').replace(queryParameters: queryParams);
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to fetch ratings');
  }

  Future<Map<String, dynamic>> createSupportTicket(Map<String, dynamic> ticketData, {String role = 'CUSTOMER'}) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/support/tickets');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: role),
      body: jsonEncode(ticketData),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to create support ticket');
  }

  Future<List<dynamic>> getUserSupportTickets({String role = 'CUSTOMER'}) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/support/tickets');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token, roleContext: role),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data as List<dynamic>;
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to list support tickets');
  }

  Future<Map<String, dynamic>> getSupportTicketDetails(String ticketId, {String role = 'CUSTOMER'}) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/support/tickets/$ticketId');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token, roleContext: role),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to get ticket details');
  }

  Future<Map<String, dynamic>> addSupportTicketMessage(String ticketId, String message, {String role = 'CUSTOMER', bool isInternal = false}) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/support/tickets/$ticketId/messages');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: role),
      body: jsonEncode({'message': message, 'isInternal': isInternal}),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to send support message');
  }

  Future<Map<String, dynamic>> getNotifications({String role = 'CUSTOMER', bool unreadOnly = false}) async {
    final token = await base.tokenStorage.getAccessToken();
    final queryParams = {'unreadOnly': unreadOnly.toString()};
    final url = Uri.parse('${base.base.baseUrl}/v1/notifications').replace(queryParameters: queryParams);
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token, roleContext: role),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to fetch notifications');
  }

  Future<void> markNotificationRead(String notificationId, {String role = 'CUSTOMER'}) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/notifications/$notificationId/read');
    await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: role),
    );
  }

  Future<void> markAllNotificationsRead({String role = 'CUSTOMER'}) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/notifications/read-all');
    await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: role),
    );
  }

  Future<Map<String, dynamic>> getPartnerEarningsDashboard() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/earnings/dashboard');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to fetch partner earnings');
  }

  Future<List<dynamic>> getPartnerSettlements() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/earnings/settlements');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data as List<dynamic>;
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to fetch partner settlements');
  }

  Future<Map<String, dynamic>> getPartnerCodStatus() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/earnings/cod');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to fetch partner COD status');
  }

  Future<Map<String, dynamic>> submitPartnerCodDeposit(double amountInr, String depositReference, {String? notes}) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/earnings/cod/deposit');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
      body: jsonEncode({
        'amountInr': amountInr,
        'depositReference': depositReference,
        if (notes != null) 'notes': notes,
      }),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to submit COD deposit');
  }

  Future<Map<String, dynamic>> getMerchantFinancialOverview() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchant/financials/overview');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'MERCHANT_ADMIN'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to fetch merchant financials');
  }

  Future<List<dynamic>> getMerchantSettlements() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchant/financials/settlements');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'MERCHANT_ADMIN'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data as List<dynamic>;
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to fetch merchant settlements');
  }
}
