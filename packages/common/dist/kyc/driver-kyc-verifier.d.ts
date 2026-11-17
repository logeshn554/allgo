export type KycDocumentType = 'DRIVING_LICENSE' | 'VEHICLE_REGISTRATION' | 'INSURANCE' | 'BACKGROUND_CHECK';
export interface RawDocumentScanInput {
    documentType: KycDocumentType;
    fileStorageKey: string;
    extractedText: string;
    uploadedAt: string;
}
export interface VerifiedKycDocument {
    documentType: KycDocumentType;
    documentNumber: string;
    holderName?: string;
    issueDate?: string;
    expiryDate?: string;
    isExpired: boolean;
    daysUntilExpiry: number;
    expiryAlertNeeded: boolean;
    status: 'VERIFIED' | 'REJECTED' | 'EXPIRED';
    verificationConfidence: number;
    rejectionReason?: string;
}
export declare class AutomatedKycVerifier {
    private readonly dlPattern;
    private readonly rcPattern;
    private readonly datePattern;
    verifyDocument(input: RawDocumentScanInput): VerifiedKycDocument;
    private verifyDrivingLicense;
    private verifyVehicleRegistration;
    private verifyInsurance;
    private verifyBackgroundCheck;
    private findExpiryDate;
    private buildResult;
}
//# sourceMappingURL=driver-kyc-verifier.d.ts.map