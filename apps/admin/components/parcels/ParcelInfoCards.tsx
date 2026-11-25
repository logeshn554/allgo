import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@allgo/ui';
import { Button } from '@allgo/ui';
import { Badge } from '@allgo/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { UndoIcon } from '@hugeicons/core-free-icons';

interface ParcelInfoCardsProps {
  parcel: any;
  onOpenReassign: () => void;
  onOpenReturn: () => void;
  onOpenCancel: () => void;
}

export const ParcelInfoCards: React.FC<ParcelInfoCardsProps> = ({
  parcel,
  onOpenReassign,
  onOpenReturn,
  onOpenCancel,
}) => {
  return (
    <div>
      {/* Top Header Card */}
      <Card className="mb-6">
        <CardContent className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Parcel #{parcel.parcel_number || parcel.parcelNumber}
              </h1>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                {parcel.status?.replace(/_/g, ' ')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Service: <strong>{parcel.service_type || parcel.serviceType}</strong> · Category: <strong>{parcel.package_category || parcel.packageCategory}</strong> · Weight: <strong>{parcel.estimated_weight_kg || parcel.weightKg} kg</strong>
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={onOpenReassign}>
              Reassign Partner
            </Button>
            <Button variant="secondary" size="sm" onClick={onOpenReturn}>
              <HugeiconsIcon icon={UndoIcon} strokeWidth={2} className="me-1.5 size-4" />
              Authorize Return
            </Button>
            <Button variant="destructive" size="sm" onClick={onOpenCancel}>
              Cancel Booking
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Sender & Recipient Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sender & Recipient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-xs font-semibold text-primary uppercase">PICKUP (SENDER)</div>
              <div className="font-medium text-foreground text-sm mt-0.5">{parcel.sender_name || parcel.senderName}</div>
              <div className="text-xs text-muted-foreground">{parcel.pickup_contact_phone || parcel.senderPhone}</div>
              <div className="text-xs text-foreground mt-1">{parcel.pickup_address || parcel.pickupAddress}</div>
            </div>
            <div className="border-t border-border pt-4">
              <div className="text-xs font-semibold text-primary uppercase">DESTINATION (RECIPIENT)</div>
              <div className="font-medium text-foreground text-sm mt-0.5">{parcel.recipient_name || parcel.recipientName}</div>
              <div className="text-xs text-muted-foreground">{parcel.recipient_phone || parcel.recipientPhone}</div>
              <div className="text-xs text-foreground mt-1">{parcel.drop_address || parcel.dropAddress}</div>
            </div>
          </CardContent>
        </Card>

        {/* Financial & Package Specs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Financial Breakdown & Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Delivery Courier Fee:</span>
              <span className="font-semibold text-foreground">₹{Number(parcel.delivery_fee_inr || parcel.deliveryFeeInr || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Platform Fee:</span>
              <span className="font-semibold text-foreground">₹{Number(parcel.platform_fee_inr || parcel.platformFeeInr || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">GST (18%):</span>
              <span className="font-semibold text-foreground">₹{Number(parcel.tax_inr || parcel.taxInr || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
              <span>Total Paid:</span>
              <span className="text-primary">₹{Number(parcel.total_amount_inr || parcel.totalAmountInr || 0).toFixed(2)}</span>
            </div>

            <div className="border-t border-border pt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Pickup PIN: </span>
                <span className="font-mono font-bold text-foreground">{parcel.pickup_otp || '••••'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Delivery PIN: </span>
                <span className="font-mono font-bold text-foreground">{parcel.delivery_otp || '••••'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
