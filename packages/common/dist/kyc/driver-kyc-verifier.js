// Job: Automated OCR parsing, document validity verification, and expiry alert engine for driver onboarding.
export class AutomatedKycVerifier {
    // Regex patterns for Indian official transport documents
    // DL: State code (2 letters) + 2 digits + 4 digits (year) + 7 digits (e.g., TN01 20180001234)
    dlPattern = /\b([A-Z]{2}[0-9]{2}[ -]?[0-9]{4}[ -]?[0-9]{7})\b/i;
    // RC: Standard Indian vehicle registration (e.g., TN-01-AB-1234 or DL01C1234)
    rcPattern = /\b([A-Z]{2}[ -]?[0-9]{1,2}[ -]?[A-Z]{1,3}[ -]?[0-9]{4})\b/i;
    // Date pattern: DD/MM/YYYY or YYYY-MM-DD
    datePattern = /\b(\d{2}[/-]\d{2}[/-]\d{4}|\d{4}[/-]\d{2}[/-]\d{2})\b/g;
    verifyDocument(input) {
        const text = input.extractedText || '';
        switch (input.documentType) {
            case 'DRIVING_LICENSE':
                return this.verifyDrivingLicense(text);
            case 'VEHICLE_REGISTRATION':
                return this.verifyVehicleRegistration(text);
            case 'INSURANCE':
                return this.verifyInsurance(text);
            case 'BACKGROUND_CHECK':
                return this.verifyBackgroundCheck(text);
            default:
                return {
                    documentType: input.documentType,
                    documentNumber: 'UNKNOWN',
                    isExpired: false,
                    daysUntilExpiry: 0,
                    expiryAlertNeeded: false,
                    status: 'REJECTED',
                    verificationConfidence: 0,
                    rejectionReason: 'Unsupported document type',
                };
        }
    }
    verifyDrivingLicense(text) {
        const dlMatch = text.match(this.dlPattern);
        if (!dlMatch) {
            return {
                documentType: 'DRIVING_LICENSE',
                documentNumber: '',
                isExpired: false,
                daysUntilExpiry: 0,
                expiryAlertNeeded: false,
                status: 'REJECTED',
                verificationConfidence: 0.2,
                rejectionReason: 'Valid Driving License number not detected in document scan',
            };
        }
        const rawDl = dlMatch[1] ?? '';
        const docNumber = rawDl.replace(/[ -]/g, '').toUpperCase();
        const expiry = this.findExpiryDate(text);
        return this.buildResult('DRIVING_LICENSE', docNumber, expiry, 0.95);
    }
    verifyVehicleRegistration(text) {
        const rcMatch = text.match(this.rcPattern);
        if (!rcMatch || !rcMatch[1]) {
            return {
                documentType: 'VEHICLE_REGISTRATION',
                documentNumber: '',
                isExpired: false,
                daysUntilExpiry: 0,
                expiryAlertNeeded: false,
                status: 'REJECTED',
                verificationConfidence: 0.2,
                rejectionReason: 'Registration number not recognized in vehicle RC scan',
            };
        }
        const rawRc = rcMatch[1] ?? '';
        const docNumber = rawRc.replace(/[ -]/g, '').toUpperCase();
        const expiry = this.findExpiryDate(text);
        return this.buildResult('VEHICLE_REGISTRATION', docNumber, expiry, 0.92);
    }
    verifyInsurance(text) {
        const hasInsuranceKeywords = /policy|insurance|coverage|motor|vehicle/i.test(text);
        if (!hasInsuranceKeywords) {
            return {
                documentType: 'INSURANCE',
                documentNumber: '',
                isExpired: false,
                daysUntilExpiry: 0,
                expiryAlertNeeded: false,
                status: 'REJECTED',
                verificationConfidence: 0.1,
                rejectionReason: 'Document does not contain valid motor insurance policy terms',
            };
        }
        const policyMatch = text.match(/\b([A-Z0-9]{8,18})\b/i);
        const docNumber = policyMatch?.[1] ? policyMatch[1] : 'POL-PENDING';
        const expiry = this.findExpiryDate(text);
        return this.buildResult('INSURANCE', docNumber, expiry, 0.88);
    }
    verifyBackgroundCheck(text) {
        const passed = /clear|no criminal|passed|verified/i.test(text);
        return {
            documentType: 'BACKGROUND_CHECK',
            documentNumber: `BGC-${Date.now()}`,
            isExpired: false,
            daysUntilExpiry: 365,
            expiryAlertNeeded: false,
            status: passed ? 'VERIFIED' : 'REJECTED',
            verificationConfidence: passed ? 0.9 : 0.3,
            rejectionReason: passed ? undefined : 'Background check certification verification failed',
        };
    }
    findExpiryDate(text) {
        const matches = text.match(this.datePattern);
        if (!matches || matches.length === 0)
            return null;
        // Pick the latest detected date in future as expiry date
        const parsedDates = matches
            .map((d) => {
            const parts = d.split(/[/-]/);
            const p0 = parts[0] ?? '';
            const p1 = parts[1] ?? '';
            const p2 = parts[2] ?? '';
            if (p0.length === 4) {
                return new Date(Number(p0), Number(p1) - 1, Number(p2));
            }
            return new Date(Number(p2), Number(p1) - 1, Number(p0));
        })
            .filter((d) => !isNaN(d.getTime()));
        if (parsedDates.length === 0)
            return null;
        parsedDates.sort((a, b) => b.getTime() - a.getTime());
        return parsedDates[0] ?? null;
    }
    buildResult(type, docNumber, expiryDate, confidence) {
        const now = new Date();
        const effectiveExpiry = expiryDate || new Date(now.getTime() + 180 * 24 * 3600 * 1000);
        const daysUntilExpiry = Math.round((effectiveExpiry.getTime() - now.getTime()) / (24 * 3600 * 1000));
        const isExpired = daysUntilExpiry <= 0;
        const expiryAlertNeeded = !isExpired && daysUntilExpiry <= 30;
        return {
            documentType: type,
            documentNumber: docNumber,
            expiryDate: effectiveExpiry.toISOString().split('T')[0],
            isExpired,
            daysUntilExpiry,
            expiryAlertNeeded,
            status: isExpired ? 'EXPIRED' : 'VERIFIED',
            verificationConfidence: confidence,
        };
    }
}
//# sourceMappingURL=driver-kyc-verifier.js.map