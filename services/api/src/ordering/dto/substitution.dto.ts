export interface ProposeSubstitutionDto {
  orderItemId: string;
  originalItemName: string;
  originalPriceInr: number;
  actionType: 'SUBSTITUTE' | 'REMOVE';
  substitutedItemId?: string;
  substitutedItemName?: string;
  substitutedPriceInr?: number;
  timeoutSeconds?: number;
}

export interface CustomerSubstitutionDecisionDto {
  decision: 'APPROVE' | 'REJECT';
}

export interface SubstitutionResult {
  id: string;
  subOrderId: string;
  status: string;
  refundDifferenceInr: number;
  message: string;
}
