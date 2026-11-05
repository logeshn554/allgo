# Legal, Regulatory & Tax Assumptions Checklist

> **CRITICAL NOTICE:** The following items represent software architecture assumptions and operational hypotheses. **None of the items in this document are asserted to be legally compliant.** Every item below must be independently reviewed, adjusted, and formally verified by qualified legal counsel and a Chartered Accountant (CA) prior to commercial pilot launch in any state or territory.

---

## 1. Reserve Bank of India (RBI) & Banking Assumptions (For Legal Counsel)

- [ ] **Assumption 1.1: Customer Wallet Characterization under RBI PPI Master Directions**
  - *Design Assumption:* The in-app customer wallet operates strictly as a closed-loop promotional/refund credit ledger (storing instant cancellation refunds, promotional credits, and referral cashbacks). It does not permit cash top-ups from users, peer-to-peer transfers, or withdrawals to external bank accounts.
  - *Verification Required:* Counsel must confirm whether operating this closed-loop refund ledger across independent third-party merchants falls within exempt closed-loop criteria or requires a formal PPI license / co-branded PPI arrangement under current RBI guidelines.

- [ ] **Assumption 1.2: Merchant & Partner Funds Handling under RBI Payment Aggregator (PA) Guidelines**
  - *Design Assumption:* Customer payments for multi-merchant carts are collected upfront via a licensed payment gateway (Razorpay). Merchant settlements are split via **Razorpay Route** (or bank nodal/escrow mechanism) so that gross merchant proceeds are settled directly from escrow to the merchant's account, preventing customer/merchant funds from commingling in the platform's operating bank account.
  - *Verification Required:* Counsel must confirm that the proposed Razorpay Route / escrow structure satisfies RBI PA/PG regulations and that the platform is not classified as an unlicensed intermediary.

- [ ] **Assumption 1.3: Partner Payouts and Cash-on-Delivery (COD) Reconciliation**
  - *Design Assumption:* Cash-on-delivery collected by delivery partners is reconciled against their accrued digital delivery earnings and platform payables, with remaining net dues settled via RazorpayX.
  - *Verification Required:* Counsel must verify partner agreement terms regarding agency, cash handling, and statutory withholding.

---

## 2. Goods and Services Tax (GST) & Direct Tax Assumptions (For Chartered Accountant - CA)

- [ ] **Assumption 2.1: Section 9(5) CGST Act - Restaurant Services**
  - *Design Assumption:* For restaurant food delivery sub-orders, the e-commerce operator (platform) is liable to pay GST at 5% on the food supply on behalf of the restaurant, without claiming Input Tax Credit (ITC). E-commerce TCS under Section 52 is not deducted on these supplies.
  - *Verification Required:* CA must confirm the exact GST return filing procedure (GSTR-3B table reporting) and state-specific nuances.

- [ ] **Assumption 2.2: Section 52 CGST Act - Tax Collected at Source (TCS) on Goods**
  - *Design Assumption:* For non-restaurant merchants (groceries, cloud kitchen packaged goods, home-made crafts/food products), the merchant is the supplier liable for GST. The platform must collect TCS at the prevailing rate (0.5% net of sales returns) and file monthly GSTR-8 returns.
  - *Verification Required:* CA must verify current TCS rates, threshold applicability, and e-way bill obligations for local store delivery.

- [ ] **Assumption 2.3: Section 194-O Income Tax Act - E-commerce Operator TDS**
  - *Design Assumption:* The platform withholds TDS at 0.1% on gross sales credited to participants (increasing to 5% if valid PAN/Aadhaar is not on file). Individual/HUF exemptions (sales under Rs 5,00,000 with PAN provided) are evaluated dynamically.
  - *Verification Required:* CA must confirm the deduction schedule, quarterly Form 26Q filing requirements, and applicability to delivery partners vs. merchants.

- [ ] **Assumption 2.4: GST on Platform Fees and Delivery Charges**
  - *Design Assumption:* Platform convenience fees and customer-facing delivery charges are subject to 18% GST collected by the platform. For delivery services performed by unregistered delivery partners, evaluate whether Section 9(5) liability applies.
  - *Verification Required:* CA must advise on tax positioning, invoicing structure, and ITC eligibility for courier compensation.

- [ ] **Assumption 2.5: Multi-State Invoicing & Inter-State vs. Intra-State Supply Rules**
  - *Design Assumption:* Each `sub_order` produces an independent GST-compliant tax invoice displaying merchant GSTIN, customer state code, and clear CGST + SGST (intra-state) or IGST (inter-state) breakdowns.
  - *Verification Required:* CA must review sample invoice layouts, mandatory invoice sequence rules, and state GST registration thresholds.

---

## 3. Motor Vehicle & Transport Aggregator Assumptions (For Transport Legal Counsel)

- [ ] **Assumption 3.1: Two-Wheeler Commercial vs. Private Registration for Food/Grocery Delivery**
  - *Design Assumption:* Pilot phase in Tamil Nadu utilizes two-wheelers for food and grocery delivery legs under standard delivery courier norms.
  - *Verification Required:* Counsel must confirm Tamil Nadu Motor Vehicles Rules regarding white-plate vs. commercial registration for two-wheeler goods delivery.

- [ ] **Assumption 3.2: Motor Vehicle Aggregator Guidelines 2020 & State Bike-Taxi Regulations**
  - *Design Assumption:* Rides, bike-taxis, and driver-hire services are disabled by default in database configuration and remain locked behind per-state feature flags until legal clearance is completed.
  - *Verification Required:* Counsel must advise on aggregator licensing, permit conditions, commercial EV mandates, maximum working hours/driver fatigue rules, and passenger insurance requirements in Tamil Nadu and prospective rollout states before activating ride features.

---

## 4. Food Safety and Consumer Protection Assumptions (For Regulatory Counsel)

- [ ] **Assumption 4.1: FSSAI Compliance for Food & Home-Made Food Verticals**
  - *Design Assumption:* All restaurant merchants, cloud kitchens, and home-made food sellers must provide a valid FSSAI registration/license number during onboarding, format-validated and verified prior to store activation.
  - *Verification Required:* Counsel must confirm platform obligations under FSSAI e-commerce guidelines (displaying hygiene ratings, FSSAI numbers on invoices, recall mechanisms).

- [ ] **Assumption 4.2: Digital Personal Data Protection (DPDP) Act 2023 Compliance**
  - *Design Assumption:* Mobile apps provide explicit, itemized consent notices for location tracking, microphone/phone access, and phone-number verification, accompanied by user data-deletion request flows.
  - *Verification Required:* Counsel must audit the consent collection mechanisms, retention policies, and cross-border data transfer boundaries.

