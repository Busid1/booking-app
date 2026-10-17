export interface ReviewInterface {
  id: string;
  rating: number;
  comment?: string | null;
  authorName: string;
  createdAt: string;
  serviceTitle?: string | null;
  staff?: { id: string; name: string } | null;
  visible?: boolean;
}

export interface ReviewsSummary {
  average: number | null;
  count: number;
  reviews: ReviewInterface[];
}

export interface AdminReview extends ReviewInterface {
  visible: boolean;
  appointment?: { date: string; service: { title: string } } | null;
}
