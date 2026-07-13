"""포폴 공개용 정적 데이터를 만든다.

입력: team_daily_status_portfolio 뷰를 JSON 배열로 내보낸 파일
      (실명·기업명은 DB 뷰에서 이미 가려져 있고, 최근 10개 기록일만 들어 있다)
출력: src/data/portfolioData.json

공개본에서는 증상·진료 같은 건강 관련 문장을 "[건강 관련 내용 비공개]"로 바꾼다.
대체 문구에 "건강"이 들어 있어 컨디션 위험 분류(risk.ts)는 그대로 유지된다.

사용: python3 scripts/build-portfolio-data.py <export.json>
"""

import json
import re
import sys
from pathlib import Path

PLACEHOLDER = "[건강 관련 내용 비공개]"

HEALTH_PATTERN = re.compile(
    "|".join(
        [
            "병원", "두통", "몸살", "감기", "복통", "통증", "아파", "아프", "발열", "열이",
            "진료", "치료", "입원", "수술", "허리", "코로나", "독감", "장염", "위염", "약을",
            "몸이 안", "몸 상태", "컨디션 난조", "컨디션 저하", "컨디션이 안", "건강 문제",
            "건강상", "건강 이슈", "멘탈", "상담", "공가", "병가", "조퇴", "응급", "어지러",
            "구토", "피로 누적", "번아웃", "수면",
        ]
    )
)

# 문장·항목 경계에서 자른다. 구분자는 그대로 보존한다
SPLIT_PATTERN = re.compile(r"(\n+|(?<=[.!?])\s+|(?<=다\.)|\s[/|]\s|;\s*|\s—\s)")

# 날짜·이름·소속처럼 문장이 아닌 값은 건드리지 않는다
SKIP_KEYS = {"date", "recorded_date", "updated_at", "syncedAt", "learnerName", "teamName", "company"}


def mask_health(text: str) -> str:
    parts = SPLIT_PATTERN.split(text)
    masked = []
    for part in parts:
        if part and not SPLIT_PATTERN.fullmatch(part) and HEALTH_PATTERN.search(part):
            masked.append(PLACEHOLDER)
        else:
            masked.append(part)
    result = "".join(masked)
    # 연달아 가려진 문장은 하나로 합친다
    return re.sub(rf"(?:{re.escape(PLACEHOLDER)}\s*)+(?={re.escape(PLACEHOLDER)})", "", result)


def walk(value, key=None):
    if isinstance(value, dict):
        return {k: walk(v, k) for k, v in value.items()}
    if isinstance(value, list):
        return [walk(v, key) for v in value]
    if isinstance(value, str) and key not in SKIP_KEYS:
        return mask_health(value)
    return value


def main() -> None:
    source = Path(sys.argv[1])
    rows = json.loads(source.read_text(encoding="utf-8"))
    cleaned = [
        {
            "team_id": row["team_id"],
            "recorded_date": row["recorded_date"],
            "updated_at": row["updated_at"],
            "payload": walk(row["payload"]),
        }
        for row in rows
    ]

    remaining = sum(len(HEALTH_PATTERN.findall(json.dumps(r["payload"], ensure_ascii=False))) for r in cleaned)
    if remaining:
        raise SystemExit(f"건강 관련 표현이 {remaining}건 남았습니다")

    out = Path(__file__).resolve().parent.parent / "src" / "data" / "portfolioData.json"
    out.write_text(json.dumps(cleaned, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(cleaned)} rows → {out}")


if __name__ == "__main__":
    main()
