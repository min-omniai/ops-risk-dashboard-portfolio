export type RiskLevel = "Normal" | "Caution" | "Warning" | "Critical";
export type RiskKey =
  | "scheduleRisk"
  | "planningRisk"
  | "technicalRisk"
  | "healthRisk"
  | "collaborationRisk";

export interface Milestone {
  name: string;
  date: string;
  status: "completed" | "upcoming";
}

export interface Team {
  teamId: number;
  company: string;
  teamName: string;
  progress: number;
  checkinRate: number;
  healthRisk: boolean;
  scheduleRisk: boolean;
  planningRisk: boolean;
  technicalRisk: boolean;
  collaborationRisk: boolean;
  status: string;
  goodPoints: string[];
  risks: string[];
  specialNotes: string[];
  requiredQuestions: string[];
  riskSourceText?: string;
  checkinHistory: {
    date: string;
    rate: number;
  }[];
}

export interface ScrumEntry {
  teamId: number;
  teamName: string;
  learnerName: string;
  date: string;
  workload: string;
  comment: string;
  note: string;
  status: string;
  progress: number | null;
}

export interface SyncedTeamPayload {
  dashboard: Team;
  scrumEntries?: ScrumEntry[];
  source: {
    briefing: string;
    specialNotes: string;
    operatorFeedback: string;
    gptSummary: string;
  };
  syncedAt: string;
}

export interface DashboardDataState {
  teams: Team[];
  availableDates: string[];
  recordedDate: string;
  scrumEntries: ScrumEntry[];
  dataUpdatedAt: string;
  checkinUpdatedThrough: string;
  sourceMode: "live" | "snapshot";
  isLoading: boolean;
  error: string;
}
