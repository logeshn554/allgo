export interface RatingItem {
  id: string;
  targetId: string;
  score: number;
  review?: string;
  isHidden: boolean;
  createdAt: string;
}
