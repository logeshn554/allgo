export interface LivenessVerificationRequest {
  partnerId: string;
  selfieStorageKey: string;
  sessionToken?: string;
}

export interface LivenessVerificationResult {
  isLive: boolean;
  confidenceScore: number; // 0.0 to 1.0
  providerRef: string;
  faceMatchScore?: number;
  checks: {
    eyeBlinkDetected: boolean;
    headTurnDetected: boolean;
    antiSpoofingPassed: boolean;
  };
  rejectionReason?: string;
}

export interface LivenessProvider {
  verifyLiveness(request: LivenessVerificationRequest): Promise<LivenessVerificationResult>;
}

export interface BackgroundCheckRequest {
  partnerId: string;
  fullName: string;
  dateOfBirth?: string;
  drivingLicenseNumber?: string;
  aadhaarNumberMasked?: string;
}

export interface BackgroundCheckResult {
  partnerId: string;
  status: 'CLEAR' | 'FLAGGED' | 'MANUAL_REVIEW';
  criminalHistoryFound: boolean;
  trafficViolationsCount: number;
  providerCheckId: string;
  verifiedAt: Date;
  remarks?: string;
}

export interface BackgroundCheckProvider {
  runBackgroundCheck(request: BackgroundCheckRequest): Promise<BackgroundCheckResult>;
}

export interface TrainingQuizSubmission {
  partnerId: string;
  serviceType: string;
  answers: { questionId: string; answerIndex: number }[];
}

export interface TrainingQuizResult {
  partnerId: string;
  passed: boolean;
  scorePercentage: number;
  totalQuestions: number;
  correctCount: number;
}

export interface DeliveryKitStepStatus {
  partnerId: string;
  tshirtProvided: boolean;
  thermalBagProvided: boolean;
  helmetCheckPassed: boolean;
  kitFeePaidInr: number;
  kitStatus: 'PENDING' | 'DISPATCHED' | 'COLLECTED';
}
