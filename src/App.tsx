import { useState } from "react";
import { project } from "./data/projectData";
import {
  DashboardHeader,
  DataSourceSummary,
  DetailLogs,
  KpiCard,
  MilestoneStrip,
  RiskRanking,
  RiskTypeSummary,
  TeamStatusTabs,
} from "./components/Dashboard";
import { calculateRiskScore, getRiskLevel, sortTeamsByRisk } from "./utils/risk";
import { useDashboardData } from "./hooks/useDashboardData";

export default function App() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const {
    teams,
    availableDates,
    recordedDate,
    dataUpdatedAt,
    checkinUpdatedThrough,
    sourceMode,
    isLoading,
    error,
    scrumEntries,
  } = useDashboardData(selectedDate);
  // 선택한 기록일을 기준일로 D-day·마일스톤을 계산한다
  const today = recordedDate;
  const scores = teams.map(calculateRiskScore);
  const rankedTeams = sortTeamsByRisk(teams);
  const topTeam = rankedTeams[0];
  const topTeamScore = topTeam ? calculateRiskScore(topTeam) : 0;
  const attentionTeams = rankedTeams.filter((team) => getRiskLevel(calculateRiskScore(team)) !== "Normal");
  const riskTeams = attentionTeams.length;
  const averageRisk = Math.round(scores.reduce((sum, score) => sum + score, 0) / teams.length);
  const highestRiskTeams = rankedTeams
    .filter((team) => calculateRiskScore(team) === topTeamScore)
    .map((team) => team.teamName)
    .join(", ");
  const attentionTeamNames = [...attentionTeams]
    .sort((a, b) => a.teamId - b.teamId)
    .map((team) => team.teamName)
    .join(", ");

  return (
    <main>
      <div className="app-shell">
        <DashboardHeader
          date={today}
          availableDates={availableDates}
          isLoading={isLoading}
          onDateChange={setSelectedDate}
        />
        <DataSourceSummary
          sources={project.dataSources}
          updatedAt={dataUpdatedAt}
          checkinUpdatedThrough={checkinUpdatedThrough}
          sourceMode={sourceMode}
          isLoading={isLoading}
          error={error}
        />
        {/* 프로젝트 현황: 위험 요약 KPI + 마일스톤 타임라인을 한 박스로 */}
        <section className="overview-panel">
          <div className="kpi-grid overview-kpis">
            <KpiCard
              label="위험도 1위 팀"
              value={topTeam?.teamName ?? "-"}
              hint={topTeam ? `${topTeam.company} · 위험점수 ${topTeamScore}점` : "분석 대기"}
              detail={highestRiskTeams && highestRiskTeams !== topTeam?.teamName ? `동점: ${highestRiskTeams}` : `${teams.length}개 팀 중 위험점수 최고`}
              tone="danger"
            />
            <KpiCard label="주의팀 수" value={`${riskTeams}개`} hint="Caution 이상 팀" detail={attentionTeamNames || "해당 없음"} tone="warning" />
            <KpiCard label="평균위험" value={averageRisk} hint={`${teams.length}개 팀 위험점수 평균`} detail={`최고 ${highestRiskTeams || "-"} ${topTeamScore}점`} tone="warning" />
          </div>
          <MilestoneStrip milestones={project.milestones} today={today} />
        </section>

        <RiskTypeSummary teams={teams} />
        <RiskRanking teams={teams} />
        <TeamStatusTabs teams={teams} />

        <DetailLogs entries={scrumEntries} teams={teams} />
        <footer>PROJECT RISK CONTROL CENTER · 공개 버전은 개인 식별 및 민감정보를 표시하지 않습니다.</footer>
      </div>
    </main>
  );
}
