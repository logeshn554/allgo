import { Card, CardContent, CardHeader, CardTitle } from '@allgo/ui';
import type React from 'react';

interface PartnerDossierInfoProps {
  partner: any;
}

export const PartnerDossierInfo: React.FC<PartnerDossierInfoProps> = ({ partner }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
      {/* Vehicle Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Vehicle & Equipment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-relaxed">
          <div>
            <strong className="text-foreground">Type:</strong>{' '}
            <span className="text-muted-foreground">
              {partner?.vehicle?.vehicle_type || 'MOTORCYCLE'}
            </span>
          </div>
          <div>
            <strong className="text-foreground">Registration:</strong>{' '}
            <span className="text-muted-foreground">
              {partner?.vehicle?.registration_number || 'TN 01 AB 1234'}
            </span>
          </div>
          <div>
            <strong className="text-foreground">Make/Model:</strong>{' '}
            <span className="text-muted-foreground">
              {partner?.vehicle?.make_model || 'Hero Splendor Plus'}
            </span>
          </div>
          <div>
            <strong className="text-foreground">Equipment Verified:</strong>{' '}
            <span className="text-muted-foreground">
              {partner?.equipment_verified ? 'Yes' : 'Pending inspection'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Financial & Compliance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Banking & Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-relaxed">
          <div>
            <strong className="text-foreground">Account Number:</strong>{' '}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs">**********7890</code>{' '}
            <span className="text-muted-foreground text-xs">(AES-256 Encrypted)</span>
          </div>
          <div>
            <strong className="text-foreground">IFSC Code:</strong>{' '}
            <span className="text-muted-foreground">{partner?.bank_ifsc || 'HDFC0001234'}</span>
          </div>
          <div>
            <strong className="text-foreground">Beneficiary:</strong>{' '}
            <span className="text-muted-foreground">
              {partner?.bank_beneficiary_name || partner?.full_name || 'Murugan S'}
            </span>
          </div>
          <div>
            <strong className="text-foreground">Aadhaar Status:</strong>{' '}
            <span className="text-primary font-semibold">Minimization Compliant (Not Stored)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
