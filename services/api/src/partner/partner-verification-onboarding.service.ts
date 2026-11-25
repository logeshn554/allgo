import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import {
  BackgroundCheckProvider,
  BackgroundCheckResult,
  DeliveryKitStepStatus,
  LivenessProvider,
  LivenessVerificationResult,
  TrainingQuizResult,
  TrainingQuizSubmission,
} from './interfaces/liveness-and-verification.interface.js';
import {
  ExternalBackgroundCheckProvider,
  RekognitionLivenessProvider,
} from './interfaces/mock-liveness-and-bgc.provider.js';

@Injectable()
export class PartnerVerificationOnboardingService {
  private readonly livenessProvider: LivenessProvider;
  private readonly bgcProvider: BackgroundCheckProvider;

  // In-memory verification records
  private readonly livenessRecords = new Map<string, LivenessVerificationResult>();
  private readonly bgcRecords = new Map<string, BackgroundCheckResult>();
  private readonly quizRecords = new Map<string, TrainingQuizResult>();
  private readonly kitRecords = new Map<string, DeliveryKitStepStatus>();

  constructor(
    @Optional() livenessProvider?: LivenessProvider,
    @Optional() bgcProvider?: BackgroundCheckProvider,
  ) {
    this.livenessProvider = livenessProvider || new RekognitionLivenessProvider();
    this.bgcProvider = bgcProvider || new ExternalBackgroundCheckProvider();
  }

  async verifySelfieLiveness(
    partnerId: string,
    selfieStorageKey: string,
  ): Promise<LivenessVerificationResult> {
    const result = await this.livenessProvider.verifyLiveness({
      partnerId,
      selfieStorageKey,
    });
    this.livenessRecords.set(partnerId, result);
    return result;
  }

  async runPartnerBackgroundCheck(
    partnerId: string,
    fullName: string,
    dlNumber?: string,
  ): Promise<BackgroundCheckResult> {
    const result = await this.bgcProvider.runBackgroundCheck({
      partnerId,
      fullName,
      drivingLicenseNumber: dlNumber,
    });
    this.bgcRecords.set(partnerId, result);
    return result;
  }

  submitTrainingQuiz(submission: TrainingQuizSubmission): TrainingQuizResult {
    if (!submission.answers || submission.answers.length === 0) {
      throw new BadRequestException('Training quiz answers cannot be empty');
    }

    const totalQuestions = submission.answers.length;
    // Simple passing evaluation: question answered is scored
    const correctCount = submission.answers.filter(
      (a) => a.answerIndex === 0 || a.answerIndex === 1,
    ).length;
    const scorePercentage = (correctCount / totalQuestions) * 100;
    const passed = scorePercentage >= 70;

    const result: TrainingQuizResult = {
      partnerId: submission.partnerId,
      passed,
      scorePercentage,
      totalQuestions,
      correctCount,
    };
    this.quizRecords.set(submission.partnerId, result);
    return result;
  }

  updateKitStatus(
    partnerId: string,
    updates: Partial<DeliveryKitStepStatus>,
  ): DeliveryKitStepStatus {
    const existing = this.kitRecords.get(partnerId) || {
      partnerId,
      tshirtProvided: false,
      thermalBagProvided: false,
      helmetCheckPassed: false,
      kitFeePaidInr: 0,
      kitStatus: 'PENDING',
    };

    const updated: DeliveryKitStepStatus = {
      ...existing,
      ...updates,
    };
    this.kitRecords.set(partnerId, updated);
    return updated;
  }

  getOnboardingVerificationSummary(partnerId: string) {
    return {
      partnerId,
      liveness: this.livenessRecords.get(partnerId) || null,
      backgroundCheck: this.bgcRecords.get(partnerId) || null,
      trainingQuiz: this.quizRecords.get(partnerId) || null,
      deliveryKit: this.kitRecords.get(partnerId) || null,
    };
  }
}
