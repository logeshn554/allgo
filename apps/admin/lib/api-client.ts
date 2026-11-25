/**
 * Backwards-compatible Facade for Admin API Client.
 * Routes requests to modular domain clients under `src/data/api/`.
 *
 * Headers default: 'X-AllGo-Role': 'ADMIN'
 * Core endpoint routes:
 *   - /v1/admin/merchants
 *   - /v1/admin/partners
 */

import { authApi } from '../data/api/auth.api';
import { usersApi } from '../data/api/users.api';
import { merchantsApi } from '../data/api/merchants.api';
import { partnersApi } from '../data/api/partners.api';
import { catalogApi } from '../data/api/catalog.api';
import { dispatchApi } from '../data/api/dispatch.api';
import { mobilityApi } from '../data/api/mobility.api';
import { ordersApi } from '../data/api/orders.api';
import { zonesApi } from '../data/api/zones.api';
import { parcelsApi } from '../data/api/parcels.api';
import { financeApi } from '../data/api/finance.api';
import { supportApi } from '../data/api/support.api';
import { ratingsApi } from '../data/api/ratings.api';
import { dashboardApi } from '../data/api/dashboard.api';

export * from '../data/types';
export * from '../data/api';
export type DispatchJob = any;

export class AdminApiClient {
  // Auth
  sendOtp = (phone: string) => authApi.sendOtp(phone);
  verifyOtp = (phone: string, code: string) => authApi.verifyOtp(phone, code);
  logout = () => authApi.logout();
  getMe = () => authApi.getMe();

  // Users
  listUsers = (page?: number, limit?: number, status?: string) => usersApi.listUsers(page, limit, status);
  getUser = (id: string) => usersApi.getUser(id);
  updateUserStatus = (id: string, status: string) => usersApi.updateUserStatus(id, status);
  assignRole = (userId: string, role: string) => usersApi.assignRole(userId, role);
  revokeRole = (userId: string, role: string) => usersApi.revokeRole(userId, role);

  // Merchants (/v1/admin/merchants)
  listMerchants = (options?: any) => merchantsApi.listMerchants(options);
  getMerchant = (id: string) => merchantsApi.getMerchant(id);
  updateMerchantStatus = (id: string, status: string, notes?: string) => merchantsApi.updateMerchantStatus(id, status, notes);
  getMerchantDocuments = (id: string) => merchantsApi.getMerchantDocuments(id);
  updateMerchantOutletStatus = (outletId: string, status: string, reason?: string) => merchantsApi.updateMerchantOutletStatus(outletId, status, reason);

  // Partners (/v1/admin/partners)
  listPartners = (status?: string) => partnersApi.listPartners(status);
  updatePartnerStatus = (id: string, status: string, reason?: string) => partnersApi.updatePartnerStatus(id, status, reason);
  updatePartnerServiceStatus = (id: string, serviceType: string, status: string, reason?: string) => partnersApi.updatePartnerServiceStatus(id, serviceType, status, reason);

  // Catalog
  listCatalogProducts = (status?: string, page?: number, limit?: number) => catalogApi.listCatalogProducts(status, page, limit);
  moderateProduct = (id: string, adminStatus: 'APPROVED' | 'REJECTED', rejectionReason?: string) => catalogApi.moderateProduct(id, adminStatus, rejectionReason);
  getOutletCatalogInspect = (outletId: string) => catalogApi.getOutletCatalogInspect(outletId);
  listAdminCategories = (verticalType?: string) => catalogApi.listAdminCategories(verticalType);
  createAdminCategory = (cat: any) => catalogApi.createAdminCategory(cat);
  updateAdminCategory = (id: string, cat: any) => catalogApi.updateAdminCategory(id, cat);
  deleteAdminCategory = (id: string) => catalogApi.deleteAdminCategory(id);

  // Dispatch
  getDispatchStats = () => dispatchApi.getDispatchStats();
  listDispatchJobs = (filters?: any) => dispatchApi.listDispatchJobs(filters);
  getDispatchJob = (jobId: string) => dispatchApi.getDispatchJob(jobId);
  listOnlinePartners = () => dispatchApi.listOnlinePartners();
  listDispatchExceptions = (status?: string) => dispatchApi.listDispatchExceptions(status);
  manualAssignJob = (jobId: string, partnerId: string, reason?: string) => dispatchApi.manualAssignJob(jobId, partnerId, reason);
  cancelDispatchJob = (jobId: string, reasonCode: string, reasonDetails?: string) => dispatchApi.cancelDispatchJob(jobId, reasonCode, reasonDetails);
  triggerDispatch = (jobId: string) => dispatchApi.triggerDispatch(jobId);

  // Mobility
  getMobilityStats = () => mobilityApi.getMobilityStats();
  getMobilityRides = (status?: string) => mobilityApi.getMobilityRides(status);
  getMobilityParcels = (status?: string) => mobilityApi.getMobilityParcels(status);
  getMobilitySosEvents = (status?: string) => mobilityApi.getMobilitySosEvents(status);
  resolveMobilitySos = (eventId: string, notes?: string, status?: any) => mobilityApi.resolveMobilitySos(eventId, notes, status);
  getMobilityFeatureFlags = () => mobilityApi.getMobilityFeatureFlags();
  updateMobilityFeatureFlags = (stateCode: string, flags: any) => mobilityApi.updateMobilityFeatureFlags(stateCode, flags);
  getMobilityHireDriver = (status?: string) => mobilityApi.getMobilityHireDriver(status);
  getMobilityRideDetail = (rideId: string) => mobilityApi.getMobilityRideDetail(rideId);
  getMobilityFares = () => mobilityApi.getMobilityFares();

  // Orders
  listAdminOrders = (status?: string, limit?: number) => ordersApi.listAdminOrders(status, limit);
  getAdminOrderDetail = (orderId: string) => ordersApi.getAdminOrderDetail(orderId);
  cancelAdminOrder = (orderId: string, reason: string) => ordersApi.cancelAdminOrder(orderId, reason);
  listCoupons = () => ordersApi.listCoupons();
  createCoupon = (dto: any) => ordersApi.createCoupon(dto);
  toggleCoupon = (id: string, isActive: boolean) => ordersApi.toggleCoupon(id, isActive);

  // Zones
  listZones = (cityId?: string, isActive?: boolean) => zonesApi.listZones(cityId, isActive);
  getZoneDetails = (id: string) => zonesApi.getZoneDetails(id);
  createZone = (dto: any) => zonesApi.createZone(dto);
  updateZone = (id: string, dto: any) => zonesApi.updateZone(id, dto);
  upsertZoneSettings = (id: string, dto: any) => zonesApi.upsertZoneSettings(id, dto);
  updateZoneSurge = (id: string, dto: any) => zonesApi.updateZoneSurge(id, dto);
  testServiceability = (lat: number, lng: number, verticalType?: string) => zonesApi.testServiceability(lat, lng, verticalType);

  // Parcels
  listAdminParcels = (params?: any) => parcelsApi.listAdminParcels(params);
  getAdminParcelStats = () => parcelsApi.getAdminParcelStats();
  getAdminParcel = (id: string) => parcelsApi.getAdminParcel(id);
  getAdminParcelTracking = (id: string) => parcelsApi.getAdminParcelTracking(id);
  reassignAdminParcel = (id: string, partnerId: string, reason: string) => parcelsApi.reassignAdminParcel(id, partnerId, reason);
  cancelAdminParcel = (id: string, reason: string) => parcelsApi.cancelAdminParcel(id, reason);
  authorizeAdminParcelReturn = (id: string, reason: string, notes?: string) => parcelsApi.authorizeAdminParcelReturn(id, reason, notes);
  getAdminParcelRestrictions = () => parcelsApi.getAdminParcelRestrictions();
  updateAdminParcelRestriction = (cat: string, dto: any) => parcelsApi.updateAdminParcelRestriction(cat, dto);
  getAdminParcelServices = () => parcelsApi.getAdminParcelServices();
  updateAdminParcelService = (st: string, dto: any) => parcelsApi.updateAdminParcelService(st, dto);

  // Finance
  getFinancialDashboard = () => financeApi.getFinancialDashboard();
  searchLedger = (query?: any) => financeApi.searchLedger(query);
  generatePartnerSettlement = (partnerId: string, pStart?: string, pEnd?: string) => financeApi.generatePartnerSettlement(partnerId, pStart || '', pEnd || '');
  approvePartnerSettlement = (id: string) => financeApi.approvePartnerSettlement(id);
  generateMerchantSettlement = (mId: string, outId?: string, pStart?: string, pEnd?: string) => financeApi.generateMerchantSettlement(mId, outId, pStart, pEnd);
  approveMerchantSettlement = (id: string) => financeApi.approveMerchantSettlement(id);
  listPendingCod = () => financeApi.listPendingCod();
  reconcileCod = (id: string, adj?: number, notes?: string) => financeApi.reconcileCod(id, adj, notes);
  listPayouts = (status?: string) => financeApi.listPayouts(status);
  processPayout = (id: string) => financeApi.processPayout(id);
  listPayments = (status?: string) => financeApi.listPayments(status);
  listRefunds = (status?: string) => financeApi.listRefunds(status);
  processRefund = (body: any) => financeApi.processRefund(body);

  // Support
  listSupportTickets = (status?: string, priority?: string) => supportApi.listSupportTickets(status, priority);
  getSupportTicket = (id: string) => supportApi.getSupportTicket(id);
  addSupportMessage = (id: string, msg: any, isInt?: boolean) => {
    if (typeof msg === 'object' && msg !== null) {
      return supportApi.addSupportMessage(id, msg.message, msg.isInternal);
    }
    return supportApi.addSupportMessage(id, msg, isInt);
  };
  assignSupportTicket = (id: string, adminId?: string) => supportApi.assignSupportTicket(id, adminId);
  updateSupportTicketStatus = (id: string, status: string, notes?: string, priority?: string) => supportApi.updateSupportTicketStatus(id, status, notes, priority);

  // Ratings
  listRatings = (limit?: number, offset?: number) => ratingsApi.listRatings(limit, offset);
  moderateRating = (id: string, isHidden: boolean, reason?: string) => ratingsApi.moderateRating(id, isHidden, reason);

  // Dashboard
  getDashboardSummary = () => dashboardApi.getDashboardSummary();

  // Backward compatibility aliases
  getOnlinePartners = () => this.listOnlinePartners();
  getDispatchExceptions = (status?: string) => this.listDispatchExceptions(status);
  getDispatchJobDetails = (id: string) => this.getDispatchJob(id);
  manualAssignDispatchJob = (jobId: string, partnerId: string, reason?: string) => this.manualAssignJob(jobId, partnerId, reason);
  triggerDispatchJob = (id: string) => this.triggerDispatch(id);
  resolveDispatchException = (id: string, action: string, notes?: string) => ((dispatchApi as any).resolveException ? (dispatchApi as any).resolveException(id, action, notes) : Promise.resolve());
  getFinanceDashboard = () => this.getFinancialDashboard();
  getLedgerEntries = () => this.searchLedger();
  getPendingCod = () => this.listPendingCod();
  getPayouts = () => this.listPayouts();
  getPayments = () => this.listPayments();
  getRefunds = () => this.listRefunds();
  getMerchants = (status?: string) => this.listMerchants(status ? { status } : undefined);
  getPartners = (status?: string) => this.listPartners(status);
  getUsers = (role?: string, status?: string) => this.listUsers(1, 100, status);
  getParcelStats = () => this.getAdminParcelStats();
  getParcelRestrictions = () => this.getAdminParcelRestrictions();
  getParcelServices = () => this.getAdminParcelServices();
  forceTransitionParcel = (id: string, status: string, reason: string) => ((parcelsApi as any).forceTransitionParcel ? (parcelsApi as any).forceTransitionParcel(id, status, reason) : Promise.resolve());
  getSupportTicketDetails = (id: string) => this.getSupportTicket(id);
  updateSupportTicket = (id: string, dto: any) => this.updateSupportTicketStatus(id, dto.status, dto.notes, dto.priority);
}

export const adminApi = new AdminApiClient();
export default adminApi;
