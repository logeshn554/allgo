// Job: Instant Grocery browse & catalog container.

import React from 'react';
import { GroceryCatalogFlowPage } from './grocery/GroceryCatalogFlowPage.tsx';

interface Props {
  onBack: () => void;
  onCheckout: () => void;
}

export const GroceryPage: React.FC<Props> = (props) => {
  return <GroceryCatalogFlowPage {...props} />;
};
