export interface Clause {
  id: string;
  text: string;
  page: number;
  section?: string;
}

export interface LeaseAnswer {
  question: string;
  answer: string;
  sourceClause: Clause | null;
  confidence: number; // 0-1
  recommendedAction?: string;
}

export interface Lease {
  id: string;
  propertyId: string;
  tenantName: string;
  landlordName: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  status: "active" | "expiring" | "expired" | "under_review";
}