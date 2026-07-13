const CONFIG = {
  managementSpreadsheetId: "17o-8mP2AsSKrtwEZKPCgD55Qbj2yPmVrAas38uU4Vzg",
  managementSheetName: "공용",
  checkinSpreadsheetId: "1imTQdYhvmgOsVHgVOySvxuy1o4FsFyJrha1CiSTVQOY",
  checkinSheetNames: ["Day-1", "Day-2", "Day-3"],
  companies: {
    1: "A 기업", 2: "A 기업", 3: "A 기업",
    4: "B 기업", 5: "B 기업",
    6: "C 기업", 7: "C 기업", 8: "C 기업",
  },
};

const RISK_KEYWORDS = {
  planningRisk: [
    "기획 미정", "기획 미확정", "미정 기획", "기획 의존", "기획 의존도",
    "기획 문서 없이", "기획서 부족", "기획안 없이", "기획안", "기획 확정",
    "확정 여부", "미수령 필수 기획", "필수 기획", "기획 자료", "기획 회의",
    "기획 협의", "특수 블록", "튜토리얼 기획", "스킬 DB", "추가 기획", "기획 유입",
    "기능 범위", "필수 범위", "범위 확정", "범위 공유", "테스트 범위",
  ],
  scheduleRisk: ["일정 지연", "마일스톤 지연", "마감 지연", "통합 지연", "일정 재조정", "일정 변경", "시간 부족", "일정 병목", "밀린 작업", "작업량 과다", "복구 일정", "마감 복구"],
  technicalRisk: ["기술 리스크", "치명 오류", "런타임 오류", "예외 처리", "작동 안", "통합 지연", "기술 검증 실패", "R&D", "핵심 루프", "플레이 가능한 빌드"],
  healthRisk: ["건강", "컨디션", "복통", "허리", "수면", "피로", "멘탈", "의욕", "조퇴", "병원", "과부하"],
  collaborationRisk: ["이탈", "탈퇴", "인원 재배치", "인수인계", "소통 문제", "협업 문제", "업무 공백", "업무 재분배", "업무 조정", "역할 조정", "팀장 회의"],
};

const CONFIRMED_RISK_SIGNALS = {
  1: ["healthRisk", "collaborationRisk"],
  2: ["scheduleRisk"],
  3: ["scheduleRisk", "technicalRisk", "healthRisk"],
  4: ["scheduleRisk", "healthRisk"],
  5: ["planningRisk", "scheduleRisk"],
  6: ["healthRisk"],
  7: ["scheduleRisk"],
  8: ["scheduleRisk", "collaborationRisk"],
};

function syncProjectRiskData() {
  const properties = PropertiesService.getScriptProperties();
  const supabaseUrl = requiredProperty_(properties, "SUPABASE_URL");
  const publishableKey = requiredProperty_(properties, "SUPABASE_PUBLISHABLE_KEY");
  const syncEmail = requiredProperty_(properties, "SYNC_EMAIL");
  const syncPassword = requiredProperty_(properties, "SYNC_PASSWORD");

  const accessToken = signIn_(supabaseUrl, publishableKey, syncEmail, syncPassword);
  const management = readManagementSheet_();
  const checkins = readCheckinSheets_();
  const recordedDate = checkins.length
    ? checkins.map((item) => item.date).sort().reverse()[0]
    : Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd");
  const syncedAt = new Date().toISOString();

  const rows = Array.from({ length: 8 }, (_, index) => {
    const teamId = index + 1;
    const source = management.teams[teamId] || emptyManagementTeam_();
    const teamCheckins = checkins.map((day) => summarizeTeamCheckin_(day, teamId));
    const scrumEntries = buildScrumEntries_(checkins, teamId);
    const dashboard = buildDashboardTeam_(teamId, source, management.gptSummary, teamCheckins);

    return {
      team_id: teamId,
      recorded_date: recordedDate,
      payload: {
        dashboard,
        scrumEntries,
        source: {
          briefing: source.briefing,
          specialNotes: source.specialNotes,
          operatorFeedback: source.operatorFeedback,
          gptSummary: extractGptTeamLine_(management.gptSummary, teamId),
        },
        syncedAt,
      },
      updated_at: syncedAt,
    };
  });

  upsertTeamStatus_(supabaseUrl, publishableKey, accessToken, rows);
  console.log(JSON.stringify({ syncedAt, recordedDate, teams: rows.length }));
}

function createTimeTrigger() {
  ScriptApp.getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === "syncProjectRiskData")
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger("syncProjectRiskData")
    .timeBased()
    .atHour(7)
    .everyDays(1)
    .inTimezone("Asia/Seoul")
    .create();
}

function readManagementSheet_() {
  const sheet = SpreadsheetApp
    .openById(CONFIG.managementSpreadsheetId)
    .getSheetByName(CONFIG.managementSheetName);
  if (!sheet) throw new Error("통합 관리 시트의 공용 탭을 찾을 수 없습니다.");

  const values = sheet.getDataRange().getDisplayValues();
  const teams = {};
  let gptSummary = "";

  values.slice(1).forEach((row) => {
    const teamMatch = String(row[0] || "").match(/^(\d+)팀/m);
    if (teamMatch) {
      teams[Number(teamMatch[1])] = {
        briefing: row[3] || "",
        specialNotes: row[4] || "",
        operatorFeedback: row[5] || "",
      };
    }
    if (!gptSummary && row[6]) gptSummary = row[6];
  });

  return { teams, gptSummary };
}

function readCheckinSheets_() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.checkinSpreadsheetId);

  return CONFIG.checkinSheetNames.map((sheetName) => {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) throw new Error("체크인 탭을 찾을 수 없습니다: " + sheetName);

    const values = sheet.getDataRange().getDisplayValues();
    return {
      sheetName,
      date: normalizeDate_(values[1] && values[1][2]),
      rows: values.slice(4).filter((row) => row[1] && row[2]),
    };
  }).filter((day) => day.date);
}

function buildScrumEntries_(days, teamId) {
  return days
    .flatMap((day) => day.rows
      .filter((row) => Number(row[1]) === teamId)
      .map((row) => {
        const workload = String(row[3] || "").trim();
        const comment = String(row[4] || "").trim();
        const note = String(row[5] || "").trim();
        const status = String(row[6] || "").trim();
        const learnerName = String(row[2] || "").trim();
        const hasContent = workload || comment || note || (status && status !== "대기");

        if (!learnerName || !hasContent) return null;

        return {
          teamId,
          teamName: teamId + "팀",
          learnerName,
          date: day.date,
          workload,
          comment,
          note,
          status: status || "상태 미기입",
          progress: parseProgress_(workload),
        };
      })
      .filter(Boolean))
    .sort((a, b) => b.date.localeCompare(a.date) || a.learnerName.localeCompare(b.learnerName, "ko"));
}

function summarizeTeamCheckin_(day, teamId) {
  const rows = day.rows.filter((row) => Number(row[1]) === teamId);
  const submitted = rows.filter((row) => row[3] || row[4] || row[5] || (row[6] && row[6] !== "대기"));
  const progressValues = submitted
    .map((row) => parseProgress_(row[3]))
    .filter((value) => value !== null);

  return {
    date: day.date,
    checkinRate: rows.length ? Math.round((submitted.length / rows.length) * 100) : 0,
    progress: progressValues.length
      ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length)
      : null,
    riskNotes: submitted
      .filter((row) => row[5] || row[6] === "주의")
      .map((row) => [row[4], row[5]].filter(Boolean).join(" "))
      .filter(Boolean),
  };
}

function buildDashboardTeam_(teamId, source, gptSummary, checkins) {
  const gptLine = extractGptTeamLine_(gptSummary, teamId);
  const latest = [...checkins].sort((a, b) => b.date.localeCompare(a.date))[0] || {};
  const combined = [
    source.briefing,
    source.specialNotes,
    source.operatorFeedback,
    gptLine,
    ...checkins.flatMap((item) => item.riskNotes),
  ].join("\n");
  const parsedSummary = parseGptTeamSummary_(gptLine);
  const risks = compactList_([parsedSummary.risk, ...extractRiskSentences_(combined)], 3);
  const goodPoints = extractPositiveSentences_(source.briefing);

  return {
    teamId,
    company: CONFIG.companies[teamId],
    teamName: teamId + "팀",
    progress: latest.progress === null || latest.progress === undefined ? 0 : latest.progress,
    checkinRate: latest.checkinRate || 0,
    planningRisk: hasConfirmedRisk_(teamId, "planningRisk", combined),
    scheduleRisk: hasConfirmedRisk_(teamId, "scheduleRisk", combined),
    technicalRisk: hasConfirmedRisk_(teamId, "technicalRisk", combined),
    healthRisk: hasConfirmedRisk_(teamId, "healthRisk", combined),
    collaborationRisk: hasConfirmedRisk_(teamId, "collaborationRisk", combined),
    status: parsedSummary.summary || deriveStatus_(combined),
    goodPoints: goodPoints.length ? goodPoints : ["체크인 및 브리핑 데이터 수집 완료"],
    risks,
    specialNotes: compactList_([source.specialNotes, ...(latest.riskNotes || [])], 2),
    requiredQuestions: compactList_([
      parsedSummary.question,
      defaultQuestion_(teamId, combined),
    ], 2),
    checkinHistory: [...checkins]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((item) => ({
        date: item.date.slice(5).replace("-", "."),
        rate: item.checkinRate,
      })),
  };
}

function extractGptTeamLine_(text, teamId) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith(teamId + "팀")) || "";
}

function parseGptTeamSummary_(line) {
  if (!line) return { summary: "", question: "" };
  const parts = line.split(/\s{2,}|\t+/).map((part) => part.trim()).filter(Boolean);
  return {
    summary: parts[2] || parts[1] || "",
    risk: parts[3] || "",
    question: parts[4] || "",
  };
}

function extractRiskSentences_(text) {
  const keywords = Object.values(RISK_KEYWORDS).flat();
  return compactList_(
    String(text || "")
      .split(/\r?\n|[.!?]\s+/)
      .map(cleanBullet_)
      .filter((line) => line.length >= 5 && hasAny_(line, keywords)),
    3,
  );
}

function extractPositiveSentences_(text) {
  const positive = ["완료", "진행", "구현", "안정", "정상", "마무리", "확정", "개선"];
  return compactList_(
    String(text || "")
      .split(/\r?\n/)
      .map(cleanBullet_)
      .filter((line) => line.length >= 5 && hasAny_(line, positive) && !line.startsWith("[")),
    2,
  );
}

function deriveStatus_(text) {
  if (hasAny_(text, ["기획 미정", "기획 미확정", "기획 의존"])) return "기획 확정 필요";
  if (hasAny_(text, ["지연", "병목", "시간 부족"])) return "일정 회복 필요";
  if (hasAny_(text, ["버그", "에러", "예외 처리"])) return "기술 검증 필요";
  return "진행 상황 확인";
}

function defaultQuestion_(teamId, text) {
  if (hasConfirmedRisk_(teamId, "planningRisk", text)) return "미확정 기획의 담당자와 확정 일정은 정해졌는가?";
  if (hasConfirmedRisk_(teamId, "scheduleRisk", text)) return "현재 가장 지연된 작업과 복구 완료일은 언제인가?";
  if (hasConfirmedRisk_(teamId, "technicalRisk", text)) return "플레이 가능한 빌드에서 핵심 흐름이 검증됐는가?";
  if (hasConfirmedRisk_(teamId, "healthRisk", text)) return "컨디션 이슈에 대비한 업무 재분배가 필요한가?";
  if (hasConfirmedRisk_(teamId, "collaborationRisk", text)) return "팀 내 병합·보고·역할 공유가 충분히 이루어지고 있는가?";
  return teamId + "팀의 다음 마일스톤 완료 기준이 명확한가?";
}

function parseProgress_(value) {
  const text = String(value || "").trim();
  const percent = text.match(/(\d{1,3})\s*%/);
  if (percent) return Math.min(Number(percent[1]), 100);
  const number = Number(text);
  if (!Number.isFinite(number)) return null;
  return number <= 1 ? Math.round(number * 100) : Math.min(Math.round(number), 100);
}

function normalizeDate_(value) {
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const date = new Date(text);
  return Number.isNaN(date.getTime())
    ? ""
    : Utilities.formatDate(date, "Asia/Seoul", "yyyy-MM-dd");
}

function cleanBullet_(value) {
  return String(value || "").replace(/^[-•\d.)\s]+/, "").trim();
}

function compactList_(values, limit) {
  return [...new Set(values.map(cleanBullet_).filter(Boolean))].slice(0, limit);
}

function isNegatedRiskContext_(text, keyword, index) {
  const after = text.slice(index + keyword.length, index + keyword.length + 8);
  const around = text.slice(Math.max(0, index - 8), index + keyword.length + 8);

  return (
    after.indexOf("없") !== -1 ||
    around.indexOf("문제 없음") !== -1 ||
    around.indexOf("이슈 없음") !== -1 ||
    around.indexOf("리스크 없음") !== -1
  );
}

function hasAny_(text, keywords) {
  const source = String(text || "");
  return keywords.some((keyword) => {
    let index = source.indexOf(keyword);
    while (index !== -1) {
      if (!isNegatedRiskContext_(source, keyword, index)) return true;
      index = source.indexOf(keyword, index + keyword.length);
    }
    return false;
  });
}

function hasConfirmedRisk_(teamId, key, text) {
  const confirmedSignals = CONFIRMED_RISK_SIGNALS[teamId];
  if (confirmedSignals) return confirmedSignals.indexOf(key) !== -1;

  return hasAny_(text, RISK_KEYWORDS[key]);
}

function emptyManagementTeam_() {
  return { briefing: "", specialNotes: "", operatorFeedback: "" };
}

function requiredProperty_(properties, name) {
  const value = properties.getProperty(name);
  if (!value) throw new Error("Script Property가 필요합니다: " + name);
  return value;
}

function signIn_(supabaseUrl, publishableKey, email, password) {
  const response = UrlFetchApp.fetch(
    supabaseUrl + "/auth/v1/token?grant_type=password",
    {
      method: "post",
      contentType: "application/json",
      headers: { apikey: publishableKey },
      payload: JSON.stringify({ email, password }),
      muteHttpExceptions: true,
    },
  );
  if (response.getResponseCode() >= 300) {
    throw new Error("Supabase 로그인 실패: " + response.getContentText());
  }
  return JSON.parse(response.getContentText()).access_token;
}

function upsertTeamStatus_(supabaseUrl, publishableKey, accessToken, rows) {
  const response = UrlFetchApp.fetch(
    supabaseUrl + "/rest/v1/team_daily_status?on_conflict=team_id,recorded_date",
    {
      method: "post",
      contentType: "application/json",
      headers: {
        apikey: publishableKey,
        Authorization: "Bearer " + accessToken,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      payload: JSON.stringify(rows),
      muteHttpExceptions: true,
    },
  );
  if (response.getResponseCode() >= 300) {
    throw new Error("Supabase 저장 실패: " + response.getContentText());
  }
}
