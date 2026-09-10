export type Urgency = "critical" | "high" | "medium" | "low";

export interface ClarkTask{
    id: string;
    title: string;
    reason: string;
    urgency: Urgency;
    leaseId?: string;
    recommendedAction?: string;
    dueDate?: string;
}