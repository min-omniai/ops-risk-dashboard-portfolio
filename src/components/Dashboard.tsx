import { useState } from "react";
import type { Milestone, RiskKey, ScrumEntry, Team } from "../types";
import {
  calculateRiskScore,
  getDaysUntil,
  getRiskColor,
  getRiskLevel,
  hasRiskSignal,
  sortTeamsByRisk,
} from "../utils/risk";
import { getKoreanWeekday } from "../utils/date";

export function DashboardHeader({
  date,
  availableDates,
  isLoading,
  onDateChange,
}: {
  date: string;
  availableDates: string[];
  isLoading: boolean;
  onDateChange: (date: string) => void;
}) {
  const weekday = getKoreanWeekday(date);
  const index = availableDates.indexOf(date);
  const first = availableDates[0];
  const last = availableDates[availableDates.length - 1];

  // 기록이 없는 날(주말·휴일)을 고르면 그 직전 기록일로 맞춘다
  function selectDate(value: string) {
    if (!value || availableDates.length === 0) return;
    const snapped = [...availableDates].reverse().find((recorded) => recorded <= value) ?? first;
    onDateChange(snapped);
  }

  return (
    <header className="dashboard-header">
      <div>
        <div className="eyebrow"><span className="live-dot" /> OPERATIONS CONTROL</div>
        <h1>팀 관리 대시보드</h1>
        <p>팀 현황은 이전 보고 내용을 기반으로 정리합니다.</p>
      </div>
      <div className="date-box">
        <span>기준일</span>
        {availableDates.length > 0 ? (
          <div className="date-picker">
            <button type="button" aria-label="이전 기록일" disabled={isLoading || index <= 0} onClick={() => onDateChange(availableDates[index - 1])}>‹</button>
            <input
              type="date"
              value={date}
              min={first}
              max={last}
              disabled={isLoading}
              onChange={(event) => selectDate(event.target.value)}
            />
            <button type="button" aria-label="다음 기록일" disabled={isLoading || index < 0 || index >= availableDates.length - 1} onClick={() => onDateChange(availableDates[index + 1])}>›</button>
          </div>
        ) : (
          <strong>{date.replaceAll("-", ". ")}</strong>
        )}
        <small>{weekday}{availableDates.length > 0 ? ` · 공개 기록 ${index + 1}/${availableDates.length}일` : ""}</small>
      </div>
    </header>
  );
}

export function DataSourceSummary({
  sources,
  updatedAt,
  checkinUpdatedThrough,
  sourceMode,
  isLoading,
  error,
}: {
  sources: string[];
  updatedAt: string;
  checkinUpdatedThrough: string;
  sourceMode: "live" | "snapshot";
  isLoading: boolean;
  error: string;
}) {
  const syncLabel = isLoading
    ? "최신 데이터 확인 중"
    : sourceMode === "live"
      ? "Sheets 동기화 완료"
      : "기본 스냅샷 표시";

  return (
    <section className={`source-summary ${error ? "source-warning" : ""}`}>
      <div><span className="source-status" /> {syncLabel}</div>
      <p>{sources.join(" + ")}</p>
      <small>{error || `동기화 ${updatedAt} · 체크인 ${checkinUpdatedThrough}까지`}</small>
    </section>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  detail,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint: string;
  detail?: string;
  tone?: string;
}) {
  return (
    <article className={`kpi-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
      {detail && <em>{detail}</em>}
    </article>
  );
}

const healthKeywords = ["건강", "컨디션", "복통", "허리", "수면", "피로", "병원", "조퇴", "지각", "멘탈", "과부하"];

function hasHealthSignal(text: string): boolean {
  return healthKeywords.some((keyword) => text.includes(keyword));
}

function getPrimaryQuestion(team: Team): string {
  return team.requiredQuestions[0] || "오늘 막힌 작업과 다음 마감 기준을 확인했는가?";
}

function getPrimaryRisk(team: Team): string {
  return team.risks[0] || getReasonSummary(team);
}

function getJudgmentCriteria(team: Team): string {
  if (hasRiskSignal(team, "planningRisk")) return "CBT 필수 범위가 오늘 안에 잠기면 진행, 아니면 범위 축소";
  if (hasRiskSignal(team, "scheduleRisk")) return "다음 마일스톤까지 복구 일정과 담당자가 명확하면 진행";
  if (hasRiskSignal(team, "technicalRisk")) return "플레이 가능한 빌드에서 핵심 루프가 검증되면 진행";
  if (hasRiskSignal(team, "healthRisk")) return "작업량 조정 후 핵심 담당 공백이 없으면 진행";
  if (team.checkinRate <= 60) return "미응답자가 확인되고 오늘 작업 로그가 채워지면 진행";
  return "오늘 완료 기준과 담당자가 명확하면 진행";
}

function getOperatorAction(team: Team): string {
  if (hasRiskSignal(team, "planningRisk")) return "기획 확정 회의 15분, 결정사항 문서화";
  if (hasRiskSignal(team, "scheduleRisk")) return "마감 복구표 작성 후 담당자 재배치";
  if (hasRiskSignal(team, "technicalRisk")) return "빌드/핵심 루프 시연으로 병목 확인";
  if (hasRiskSignal(team, "healthRisk")) return "컨디션 확인 후 업무량 조정";
  if (hasRiskSignal(team, "collaborationRisk")) return "담당 경계와 인수인계 항목 정리";
  if (team.checkinRate <= 60) return "미체크 인원에게 오늘 작업 로그 요청";
  return "현재 계획 유지, 다음 체크인만 확인";
}

function getHealthWatchItems(entries: ScrumEntry[], teams: Team[]) {
  return teams
    .filter((team) => team.healthRisk)
    .map((team) => {
      const learnerSignals = entries
        .filter((entry) => entry.teamId === team.teamId)
        .filter((entry) => hasHealthSignal([entry.workload, entry.comment, entry.note, entry.status].join(" ")))
        .sort((a, b) => b.date.localeCompare(a.date));

      return {
        team,
        learnerSignals,
        summary: [...team.specialNotes, ...team.risks].find(hasHealthSignal) || team.status,
      };
    });
}

export function HealthWatch({ entries, teams }: { entries: ScrumEntry[]; teams: Team[] }) {
  const watchItems = getHealthWatchItems(entries, teams);

  return (
    <section className="health-compact">
      <div className="health-compact-summary">
        <strong>컨디션 주의</strong>
        <span>{watchItems.length}팀</span>
        <small>{watchItems.map((item) => item.team.teamName).join(", ") || "해당 없음"}</small>
      </div>
      {watchItems.length > 0 && (
        <details className="health-detail">
          <summary>개인 상세 보기</summary>
          <div className="health-detail-list">
            {watchItems.map(({ team, learnerSignals, summary }) => (
              <article key={team.teamId}>
                <b>{team.teamName}</b>
                {learnerSignals.length ? (
                  learnerSignals.slice(0, 3).map((entry) => (
                    <p key={`${entry.learnerName}-${entry.date}`}>
                      <span>{entry.learnerName}</span>
                      {entry.date} · {[entry.note, entry.comment, entry.status].filter(Boolean).join(" · ") || entry.workload}
                    </p>
                  ))
                ) : (
                  <p><span>팀 단위</span>{summary}</p>
                )}
              </article>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

export function RiskBadge({ score }: { score: number }) {
  const level = getRiskLevel(score);
  return <span className="risk-badge" style={{ color: getRiskColor(level), borderColor: `${getRiskColor(level)}66`, background: `${getRiskColor(level)}18` }}>{level}</span>;
}

export function ProgressBar({ value, kind = "progress" }: { value: number; kind?: "progress" | "checkin" | "risk-density" }) {
  const color = kind === "risk-density"
    ? value <= 25
      ? "#3fb950"
      : value <= 50
        ? "#d29922"
        : value < 75
          ? "#fb8500"
          : "#f85149"
    : value < 60
      ? "#f85149"
      : value < 75
        ? "#d29922"
        : kind === "checkin"
          ? "#58a6ff"
          : "#3fb950";
  return <div className="bar-track"><span style={{ width: `${value}%`, background: color }} /></div>;
}

export function MilestoneStrip({ milestones, today }: { milestones: Milestone[]; today: string }) {
  const milestonesWithDays = milestones.map((item) => ({ item, days: getDaysUntil(item.date, today) }));
  const currentIndex = milestonesWithDays.findIndex(({ days }) => days >= 0);

  return (
    <div className="timeline" aria-label="마일스톤">
      {milestonesWithDays.map(({ item, days }, index) => {
        const computedStatus = days < 0 ? "completed" : item.status;
        const isCurrent = index === currentIndex;
        return (
          <div className={`milestone ${computedStatus} ${isCurrent ? "current" : ""}`} key={item.name}>
            <div className="milestone-top"><span className="milestone-dot">{computedStatus === "completed" ? "✓" : index + 1}</span><span className="timeline-line" /></div>
            <strong>{item.name}</strong><small>{item.date.replaceAll("-", ". ")}</small>
            <em>{formatDday(days)}</em>
          </div>
        );
      })}
    </div>
  );
}

function formatDday(days: number): string {
  if (days < 0) return `D+${Math.abs(days)}`;
  if (days === 0) return "D-DAY";
  return `D-${days}`;
}

function getReasonSummary(team: Team): string {
  const flags = [
    hasRiskSignal(team, "planningRisk") && "기획 미확정",
    hasRiskSignal(team, "scheduleRisk") && "일정 지연",
    hasRiskSignal(team, "technicalRisk") && "기술 리스크",
    hasRiskSignal(team, "healthRisk") && "컨디션 이슈",
    hasRiskSignal(team, "collaborationRisk") && "협업 이슈",
  ].filter(Boolean);
  return flags.length ? flags.join(" · ") : team.risks[0] ?? "현재 주요 위험 없음";
}

export function RiskRanking({ teams }: { teams: Team[] }) {
  return (
    <section className="panel ranking-panel">
      <SectionTitle title="위험 우선순위" subtitle="팀 / 점수 / 핵심 리스크 / 확인 질문 / 액션" />
      <div className="ranking-head"><span>팀</span><span>위험</span><span>핵심 리스크</span><span>확인 질문 / 액션</span></div>
      <div className="ranking-list">
        {sortTeamsByRisk(teams).map((team, index) => {
          const score = calculateRiskScore(team);
          const level = getRiskLevel(score);
          // 행 배경은 순위가 아니라 등급을 따른다: Warning(노랑)·Critical(빨강)만 강조
          const levelClass = level === "Critical" ? "level-critical" : level === "Warning" ? "level-warning" : "";
          return (
            <article className={`ranking-row ${levelClass}`} key={team.teamId}>
              <div className="rank-team"><b className="rank">{String(index + 1).padStart(2, "0")}</b><div><strong>{team.teamName}</strong><small>{team.company}</small></div></div>
              <div className="score"><strong style={{ color: getRiskColor(getRiskLevel(score)) }}>{score}</strong><RiskBadge score={score} /></div>
              <p className="reason">{getReasonSummary(team)}</p>
              <ul className="checklist">
                <li><span />{getPrimaryQuestion(team)}</li>
                <li><span />{getOperatorAction(team)}</li>
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function ScrumHistory({ entries, teams }: { entries: ScrumEntry[]; teams: Team[] }) {
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.teamId ?? 1);
  const [searchTerm, setSearchTerm] = useState("");
  const selectedTeam = teams.find((team) => team.teamId === selectedTeamId) ?? teams[0];
  const teamEntries = entries
    .filter((entry) => entry.teamId === selectedTeam?.teamId)
    .sort((a, b) => b.date.localeCompare(a.date));
  const learnerNames = [...new Set(teamEntries.map((entry) => entry.learnerName))]
    .filter((name) => name.includes(searchTerm.trim()))
    .sort((a, b) => a.localeCompare(b, "ko"));

  return (
    <section className="scrum-history-panel">
      <SectionTitle
        title="최근 3일 스크럼 히스토리"
        subtitle="팀별 학습자 작업 기록을 날짜 내림차순으로 확인합니다"
      />
      <div className="scrum-toolbar">
        <div className="scrum-team-tabs" role="tablist" aria-label="스크럼 히스토리 팀 선택">
          {teams.map((team) => (
            <button
              aria-selected={selectedTeam?.teamId === team.teamId}
              className={selectedTeam?.teamId === team.teamId ? "active" : ""}
              key={team.teamId}
              onClick={() => setSelectedTeamId(team.teamId)}
              role="tab"
              type="button"
            >
              <span>{team.teamName}</span>
              <small>{team.company}</small>
            </button>
          ))}
        </div>
        <label className="scrum-search">
          <span>학습자 검색</span>
          <input
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="이름 입력"
            type="search"
            value={searchTerm}
          />
        </label>
      </div>

      {teamEntries.length === 0 ? (
        <div className="scrum-empty">
          아직 학습자별 스크럼 히스토리가 동기화되지 않았습니다. 최신 Apps Script의 syncProjectRiskData를 한 번 실행하면 표시됩니다.
        </div>
      ) : learnerNames.length === 0 ? (
        <div className="scrum-empty">검색 조건에 맞는 학습자가 없습니다.</div>
      ) : (
        <div className="scrum-learner-grid">
          {learnerNames.map((learnerName) => {
            const learnerEntries = teamEntries.filter((entry) => entry.learnerName === learnerName);
            return (
              <article className="scrum-learner-card" key={learnerName}>
                <header>
                  <div>
                    <span>{selectedTeam?.company} · {selectedTeam?.teamName}</span>
                    <h3>{learnerName}</h3>
                  </div>
                  <strong>{learnerEntries.length}건</strong>
                </header>
                <div className="scrum-entry-list">
                  {learnerEntries.map((entry) => (
                    <div className="scrum-entry-item" key={`${entry.learnerName}-${entry.date}`}>
                      <div className="scrum-entry-head">
                        <b>{entry.date}</b>
                        <span className="scrum-progress-chip">
                          {entry.progress === null ? "진척 미기입" : `${entry.progress}%`}
                        </span>
                      </div>
                      <p>{entry.workload || "작업 내용 미기입"}</p>
                      {entry.comment && <small>{entry.comment}</small>}
                      {entry.note && <em>{entry.note}</em>}
                      <span className="scrum-status">{entry.status || "상태 미기입"}</span>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

const categories: { key: RiskKey; label: string }[] = [
  { key: "scheduleRisk", label: "일정" },
  { key: "planningRisk", label: "기획" },
  { key: "technicalRisk", label: "기술" },
  { key: "healthRisk", label: "컨디션" },
  { key: "collaborationRisk", label: "협업" },
];

function getRiskBottleneck(team: Team, key: RiskKey): string {
  const candidates = [
    ...team.risks,
    ...team.specialNotes,
    team.status,
    team.riskSourceText,
  ]
    .filter((text): text is string => Boolean(text))
    .flatMap((text) => text.split(/\r?\n|[.!?]\s+/))
    .map((text) => text.replace(/\s+/g, " ").replace(/^[-•\d.)\s]+/, "").trim())
    .filter((text) =>
      text.length >= 5 &&
      text.length <= 90 &&
      !/[🟢🟡🔴]/.test(text) &&
      !/^팀\s/.test(text) &&
      !/병목 없음|지연[·\s]*병목 없음|위험 없음|순조|정상|양호|계획대로|당부/.test(text)
    );

  if (key === "planningRisk") {
    return candidates.find((text) => /기획|범위|확정|튜토리얼|스킬 DB|특수 블록/.test(text)) || getPrimaryQuestion(team);
  }
  if (key === "scheduleRisk") {
    return candidates.find((text) => /일정|지연|마감|병목|시간|복구|범위/.test(text)) || getPrimaryQuestion(team);
  }
  if (key === "technicalRisk") {
    return candidates.find((text) => /기술|버그|에러|빌드|루프|검증|예외|통합/.test(text)) || getPrimaryQuestion(team);
  }
  if (key === "healthRisk") {
    return candidates.find((text) => /건강|컨디션|피로|수면|복통|허리|병원|과부하|멘탈/.test(text)) || getPrimaryQuestion(team);
  }
  return candidates.find((text) => /협업|소통|인수인계|업무 공백|회의|이탈|재배치/.test(text)) || getPrimaryQuestion(team);
}

// 리스크 유형 요약: 유형별로 몇 팀이 해당하는지 막대 하나로 보여준다 (팀별 근거는 팀 상세 보기)
export function RiskTypeSummary({ teams }: { teams: Team[] }) {
  return (
    <section className="panel risk-type-summary">
      <SectionTitle title="리스크 유형" subtitle={`${teams.length}개 팀 중 유형별 해당 팀 수 · 근거는 팀 상세 현황의 상세 보기`} />
      <ul>
        {categories.map(({ key, label }) => {
          const affected = teams.filter((team) => hasRiskSignal(team, key));
          const names = affected.map((team) => team.teamName).join(", ") || "해당 없음";
          return (
            <li key={key} title={`${label}: ${names}`}>
              <strong>{label}</strong>
              <div className="risk-type-bar" role="img" aria-label={`${label} ${affected.length}/${teams.length}팀`}>
                <span style={{ width: `${(affected.length / teams.length) * 100}%` }} />
              </div>
              <b>{affected.length}<small>/{teams.length}팀</small></b>
              <em>{names}</em>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function TeamCard({ team }: { team: Team }) {
  const score = calculateRiskScore(team);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <article className="team-card compact-team-card">
      <header>
        <div><span>{team.company}</span><h3>{team.teamName}</h3></div>
        <div className="team-score"><strong>{score}</strong><RiskBadge score={score} /></div>
      </header>
      <div className="team-card-lines">
        <p><b>상태</b><span>{team.status}</span></p>
        <p><b>핵심 리스크</b><span>{getPrimaryRisk(team)}</span></p>
        <p><b>오늘 질문</b><span>{getPrimaryQuestion(team)}</span></p>
        <p><b>운영 액션</b><span>{getOperatorAction(team)}</span></p>
        <p><b>상세 보기</b><button type="button" onClick={() => setIsOpen((value) => !value)}>{isOpen ? "접기" : "열기"}</button></p>
      </div>
      {isOpen && (
        <div className="team-card-detail">
          <div className="metric"><div><span>운영 추정 진척도</span><b>{team.progress}%</b></div><ProgressBar value={team.progress} /></div>
          <div className="metric"><div><span>일일 보고 제출률</span><b>{team.checkinRate}%</b></div><ProgressBar value={team.checkinRate} kind="checkin" /></div>
          <div className="team-risk-types">
            <b>리스크 유형</b>
            {categories.some(({ key }) => hasRiskSignal(team, key)) ? (
              <ul>
                {categories.filter(({ key }) => hasRiskSignal(team, key)).map(({ key, label }) => {
                  const evidence = getRiskBottleneck(team, key);
                  // 근거 문장이 없어 확인 질문으로 대체된 경우는 아래 확인 질문과 겹치므로 생략
                  const isFallback = evidence === getPrimaryQuestion(team) || team.requiredQuestions.includes(evidence);
                  return (
                    <li key={key}><span>{label}</span><p>{isFallback ? "키워드 신호로 분류됨 · 확인 질문 참고" : evidence}</p></li>
                  );
                })}
              </ul>
            ) : (
              <p className="empty">해당 없음</p>
            )}
          </div>
          <div className="team-questions">
            <b>확인 질문</b>
            <ol>
              {(team.requiredQuestions.length ? team.requiredQuestions : [getPrimaryQuestion(team)]).map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ol>
            <p><span>판단 기준</span>{getJudgmentCriteria(team)}</p>
            <p><span>후속 조치</span>{getOperatorAction(team)}</p>
          </div>
          <div className="team-details">
            <DetailBlock label="GOOD" items={team.goodPoints} className="good" />
            <DetailBlock label="RISK" items={team.risks.length ? team.risks : ["현재 등록된 위험 없음"]} className="risk" />
            {team.specialNotes.length > 0 && <DetailBlock label="NOTE" items={team.specialNotes} className="note" />}
          </div>
        </div>
      )}
    </article>
  );
}

const companies = ["A 기업", "B 기업", "C 기업"] as const;

export function TeamStatusTabs({ teams }: { teams: Team[] }) {
  const [selectedCompany, setSelectedCompany] = useState<(typeof companies)[number]>("A 기업");
  const visibleTeams = teams.filter((team) => team.company === selectedCompany);

  return (
    <section className="teams-section">
      <div className="team-section-heading">
        <SectionTitle
          title="팀 상세 현황"
          subtitle="상태 / 핵심 리스크 / 오늘 질문 / 운영 액션 / 상세 보기"
        />
        <div className="company-tabs" role="tablist" aria-label="기업별 팀 선택">
          {companies.map((company) => {
            const companyTeams = teams.filter((team) => team.company === company);
            const isSelected = selectedCompany === company;
            return (
              <button
                aria-controls={`company-panel-${companies.indexOf(company)}`}
                aria-selected={isSelected}
                className={isSelected ? "active" : ""}
                key={company}
                onClick={() => setSelectedCompany(company)}
                role="tab"
                type="button"
              >
                <span>{company}</span>
                <b>{companyTeams.length}</b>
              </button>
            );
          })}
        </div>
      </div>
      <div
        aria-label={`${selectedCompany} 팀 상세 현황`}
        className={`team-grid company-team-grid team-count-${visibleTeams.length}`}
        id={`company-panel-${companies.indexOf(selectedCompany)}`}
        role="tabpanel"
      >
        {visibleTeams.map((team) => <TeamCard team={team} key={team.teamId} />)}
      </div>
    </section>
  );
}

export function DetailLogs({ entries, teams }: { entries: ScrumEntry[]; teams: Team[] }) {
  return (
    <section className="panel detail-logs-panel">
      <SectionTitle title="상세 로그" subtitle="컨디션 / 최근 3일 스크럼 / 학습자별 기록" />
      <HealthWatch entries={entries} teams={teams} />
      <ScrumHistory entries={entries} teams={teams} />
    </section>
  );
}

// 보고 원문의 줄바꿈 구조를 살린다: [작성자], ## 소제목, - 목록, 일반 문단
function FormattedText({ text }: { text: string }) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length <= 1) return <>{text}</>;

  return (
    <div className="formatted-text">
      {lines.map((line, index) => {
        if (/^\[[^\]]+\]$/.test(line)) return <span className="ft-author" key={index}>{line}</span>;
        if (line.startsWith("#")) return <strong className="ft-heading" key={index}>{line.replace(/^#+\s*/, "")}</strong>;
        if (/^[-•]\s*/.test(line)) return <span className="ft-bullet" key={index}>{line.replace(/^[-•]\s*/, "")}</span>;
        return <p className="ft-paragraph" key={index}>{line}</p>;
      })}
    </div>
  );
}

function DetailBlock({ label, items, className }: { label: string; items: string[]; className: string }) {
  return (
    <div className={`detail-block ${className}`}>
      <b>{label}</b>
      <ul>{items.map((item) => <li key={item}><FormattedText text={item} /></li>)}</ul>
    </div>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="section-title"><div><h2>{title}</h2><p>{subtitle}</p></div></div>;
}
