import { OrderStatus } from '../contracts/order-status.ts';
export { OrderStatus };
export type { OrderStatus as OrderStatusType };
/**
 * Terminal states where no further standard forward transitions can occur
 */
export declare const TERMINAL_ORDER_STATUSES: readonly OrderStatus[];
/**
 * Active in-flight order statuses
 */
export declare const ACTIVE_ORDER_STATUSES: readonly OrderStatus[];
//# sourceMappingURL=order-status.enum.d.ts.map