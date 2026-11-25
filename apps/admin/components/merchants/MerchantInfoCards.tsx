import type { MerchantApplicationSummary } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@allgo/ui';
import { Badge } from '@allgo/ui';
import type React from 'react';

interface MerchantInfoCardsProps {
  merchant: MerchantApplicationSummary;
}

export const MerchantInfoCards: React.FC<MerchantInfoCardsProps> = ({ merchant }) => {
  const m = merchant as any;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      {/* Statutory Business Identity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Statutory Business Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">Legal Entity: </span>
            <strong className="text-foreground">{m.legal_name || m.business_name}</strong>
          </div>
          <div>
            <span className="text-muted-foreground">Vertical Category: </span>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              {m.vertical_type || 'RESTAURANT'}
            </Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Contact Signatory: </span>
            <strong className="text-foreground">{m.contact_name || 'N/A'}</strong> ({m.phone})
          </div>
          <div>
            <span className="text-muted-foreground">Permanent Account (PAN): </span>
            <span className="font-mono font-bold text-foreground">{m.pan_number || 'N/A'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">GSTIN: </span>
            <span className="font-mono font-bold text-foreground">
              {m.gstin || 'Unregistered / Composite'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Food Safety & Public Health */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">FSSAI Food Safety Compliance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">FSSAI License #: </span>
            <strong className="font-mono text-foreground">
              {m.fssai_license_number || 'NOT SUBMITTED'}
            </strong>
          </div>
          <div>
            <span className="text-muted-foreground">Expiry Date: </span>
            <span className="text-foreground">
              {m.fssai_expiry_date ? new Date(m.fssai_expiry_date).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Verification Check: </span>
            <Badge variant={m.fssai_license_number ? 'default' : 'secondary'}>
              {m.fssai_license_number ? 'License Recorded' : 'Pending Verification'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Bank & Settlement Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Settlement Bank Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">Beneficiary Name: </span>
            <strong className="text-foreground">{m.bank_beneficiary_name || 'N/A'}</strong>
          </div>
          <div>
            <span className="text-muted-foreground">Account Number: </span>
            <span className="font-mono text-foreground">
              {m.bank_account_number ? `•••• •••• •••• ${m.bank_account_number.slice(-4)}` : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">IFSC Code: </span>
            <strong className="font-mono text-foreground">{m.bank_ifsc || 'N/A'}</strong>
          </div>
        </CardContent>
      </Card>

      {/* Primary Outlet */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Primary Outlet Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">Outlet Name: </span>
            <strong className="text-foreground">{m.outlet_name || 'Primary Outlet'}</strong>
          </div>
          <div>
            <span className="text-muted-foreground">Address: </span>
            <span className="text-foreground">
              {m.address_line1 || 'N/A'}, PIN: {m.postal_code || 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Operational Duty: </span>
            <Badge variant={m.is_open ? 'default' : 'secondary'}>
              {m.is_open ? 'OPEN FOR ORDERS' : 'STORE CLOSED'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
