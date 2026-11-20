// Job: Screen to choose Bike, Auto, Mini, Prime SUV with multi-stop autocomplete and live tracking.

import React from 'react';
import { RideBookingFlowPage } from './rides/RideBookingFlowPage.tsx';

interface Props {
  onBack: () => void;
  onRideBooked: (orderId: string) => void;
}

export const RideBookingPage: React.FC<Props> = (props) => {
  return <RideBookingFlowPage {...props} />;
};
