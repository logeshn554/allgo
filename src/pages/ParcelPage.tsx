// Job: Parcel delivery booking container.

import React from 'react';
import { ParcelBookingFlowPage } from './parcel/ParcelBookingFlowPage.tsx';

interface Props {
  onBack: () => void;
  onCheckout: () => void;
}

export const ParcelPage: React.FC<Props> = (props) => {
  return <ParcelBookingFlowPage {...props} />;
};
