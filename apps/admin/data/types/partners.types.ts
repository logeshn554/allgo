export type PartnerServiceType = 'RIDE_HAILING' | 'DELIVERY' | 'HIRE_DRIVER' | 'INTERCITY';

export type PartnerApplicationStatus =
  | 'REGISTERED'
  | 'DOCS_SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED';

export interface PartnerServiceApplication {
  id: string;
  service_type: PartnerServiceType;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  documents?: any[];
}

export interface PartnerApplicationSummary {
  id: string;
  user_id: string;
  status: PartnerApplicationStatus;
  full_name?: string;
  phone?: string;
  email?: string;
  services?: PartnerServiceApplication[];
  created_at: string;
}
