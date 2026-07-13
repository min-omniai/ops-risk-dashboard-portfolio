import { useMemo } from "react";
import { teams as snapshotTeams, project } from "../data/projectData";
import portfolioData from "../data/portfolioData.json";
import type { DashboardDataState, ScrumEntry, SyncedTeamPayload, Team } from "../types";

const initialState: DashboardDataState = {
  teams: snapshotTeams,
  availableDates: [],
  recordedDate: project.today,
  scrumEntries: [],
  dataUpdatedAt: project.dataUpdatedAt,
  checkinUpdatedThrough: project.checkinUpdatedThrough,
  sourceMode: "snapshot",
  isLoading: true,
  error: "",
};

function isTeam(value: unknown): value is Team {
  if (!value || typeof value !== "object") return false;
  const team = value as Team;
  return (
    Number.isInteger(team.teamId) &&
    typeof team.company === "string" &&
    typeof team.teamName === "string" &&
    typeof team.progress === "number" &&
    typeof team.checkinRate === "number" &&
    Array.isArray(team.risks) &&
    Array.isArray(team.requiredQuestions) &&
    Array.isArray(team.checkinHistory)
  );
}

function isScrumEntry(value: unknown): value is ScrumEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as ScrumEntry;
  return (
    Number.isInteger(entry.teamId) &&
    typeof entry.teamName === "string" &&
    typeof entry.learnerName === "string" &&
    typeof entry.date === "string" &&
    typeof entry.workload === "string" &&
    typeof entry.comment === "string" &&
    typeof entry.note === "string" &&
    typeof entry.status === "string"
  );
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

type PortfolioRow = {
  team_id: number;
  recorded_date: string;
  updated_at: string;
  payload: SyncedTeamPayload;
};

// 포폴 공개본은 로그인 없이 정적 데이터를 읽는다.
// portfolioData.json은 DB 뷰(team_daily_status_portfolio: 실명·기업명 가림, 최근 10일)를 내보낸 뒤
// scripts/build-portfolio-data.py로 건강 관련 문장을 가린 결과다.
const rows = portfolioData as PortfolioRow[];
const availableDates = [...new Set(rows.map((row) => row.recorded_date))].sort();

function buildState(selectedDate: string | null): DashboardDataState {
  const targetDate = selectedDate ?? availableDates[availableDates.length - 1];

  const latestByTeam = new Map<number, PortfolioRow>();
  [...rows]
    .filter((row) => !targetDate || row.recorded_date <= targetDate)
    .sort((a, b) => b.recorded_date.localeCompare(a.recorded_date) || b.updated_at.localeCompare(a.updated_at))
    .forEach((row) => {
      if (!latestByTeam.has(row.team_id)) latestByTeam.set(row.team_id, row);
    });

  const selectedRows = [...latestByTeam.values()];

  const liveTeams = selectedRows
    .flatMap((row): Team[] => {
      const payload = row.payload;
      if (!isTeam(payload?.dashboard)) return [];

      return [{
        ...payload.dashboard,
        riskSourceText: [
          payload.source?.briefing,
          payload.source?.specialNotes,
          payload.source?.operatorFeedback,
          payload.source?.gptSummary,
        ].filter(Boolean).join("\n"),
      }];
    })
    .sort((a, b) => a.teamId - b.teamId);

  const scrumEntries = selectedRows
    .flatMap((row) => (Array.isArray(row.payload?.scrumEntries) ? row.payload.scrumEntries : []))
    .filter(isScrumEntry)
    .sort((a, b) => b.date.localeCompare(a.date) || a.learnerName.localeCompare(b.learnerName));

  if (liveTeams.length !== 8) {
    return {
      ...initialState,
      availableDates,
      isLoading: false,
      error: `공개 데이터가 ${liveTeams.length}/8팀만 있어 기본 스냅샷을 표시합니다.`,
    };
  }

  const latestUpdate = selectedRows.reduce((latest, row) => (row.updated_at > latest ? row.updated_at : latest), selectedRows[0].updated_at);
  const latestRecordedDate = selectedRows.reduce(
    (latest, row) => (row.recorded_date > latest ? row.recorded_date : latest),
    selectedRows[0].recorded_date,
  );

  return {
    teams: liveTeams,
    availableDates,
    recordedDate: latestRecordedDate,
    scrumEntries,
    dataUpdatedAt: formatTimestamp(latestUpdate),
    checkinUpdatedThrough: latestRecordedDate,
    sourceMode: "live",
    isLoading: false,
    error: "",
  };
}

export function useDashboardData(selectedDate: string | null): DashboardDataState {
  return useMemo(() => buildState(selectedDate), [selectedDate]);
}
