# 🏆 OpenCode Kaggle Competition Agents

ML 경진대회(Kaggle, Dacon) 자동화를 위한 OpenCode 플러그인

## 에이전트 구성

| Agent | 역할 | 모델 | 모드 |
|-------|------|------|------|
| `comp_orch` | 오케스트레이션 | GLM-4.7 | **Primary** (Tab) |
| `comp_plan` | 전략 수립, 규칙 분석 | GPT-5.2 Codex | **Primary** (Tab) |
| `insight` | 데이터 분석, 시각화 | Gemini 3 Pro | Subagent (@) |
| `learn_optim` | 모델 학습, 최적화 | GPT-5.2 Codex | Subagent (@) |
| `quick_task` | 빠른 서브태스크 | GLM-4.7-Flash | Subagent (@) |

## 설치

```bash
# 1. 프로젝트 폴더에 .opencode/agent 생성
mkdir -p .opencode/agent

# 2. 5개 .md 파일 복사
cp agents/*.md .opencode/agent/

# 3. (선택) MCP 설정 - opencode.json에 추가
```

### MCP 설정 (권장)

`opencode.json`에 추가하면 웹 검색, 문서 조회, GitHub 검색 가능:

```json
{
  "mcp": {
    "exa": {
      "type": "local",
      "command": ["npx", "-y", "@anthropic/mcp-exa"],
      "enabled": true,
      "environment": {
        "EXA_API_KEY": "your-key"
      }
    },
    "context7": {
      "type": "local",
      "command": ["npx", "-y", "@anthropic/context7-mcp"],
      "enabled": true
    },
    "gh_grep": {
      "type": "local",
      "command": ["npx", "-y", "@anthropic/mcp-gh-grep"],
      "enabled": true
    }
  }
}
```

## 사용법

### 🚀 완전 자동화 모드 (권장)

**URL만 던지면 끝!**

```
https://www.kaggle.com/competitions/titanic
```

이것만 입력하면 comp_orch가 알아서:
1. ✅ 웹 검색으로 대회 정보 수집 (MCP: exa)
2. ✅ 대회 분석 (@comp_plan)
3. ✅ **병렬** EDA & 파일체크 (@insight + @quick_task)
4. ✅ GitHub에서 솔루션 검색 (MCP: gh_grep)
5. ✅ Feature Engineering (@insight)
6. ✅ **병렬** 모델 학습 (LGB, XGB, CatBoost)
7. ✅ Optuna 하이퍼파라미터 최적화
8. ✅ 앙상블
9. ✅ submission.csv 생성

**질문 안 함. 확인 안 함. 병렬로 빠르게 실행.**

### Tab 키로 에이전트 전환
```
[comp_orch] ← Tab → [comp_plan]
     ↑                    ↑
  완전 자동화          전략만 보기
```

## 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                 comp_orch (GLM-4.7)                         │
│                 오케스트레이터 + MCP                         │
│                                                             │
│  MCP Tools:                                                 │
│  ├─ exa_search (웹 검색)                                   │
│  ├─ context7 (공식 문서)                                   │
│  └─ gh_grep (GitHub 검색)                                  │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  comp_plan    │   │   insight     │   │ learn_optim   │
│  GPT-5.2      │   │  Gemini 3 Pro │   │   GPT-5.2     │
│  전략 수립     │   │  데이터 분석   │   │  모델 최적화   │
└───────────────┘   └───────────────┘   └───────────────┘
        │                     │                     │
        └─────────────────────┴─────────────────────┘
                              │
                    ┌─────────────────┐
                    │   quick_task    │
                    │  GLM-4.7-Flash  │
                    │   빠른 검증      │
                    └─────────────────┘

        ═══════════════════════════════════════════
                    병렬 실행 가능 구간
        ═══════════════════════════════════════════
        
        Phase 2: @insight(EDA) ║ @quick_task(파일체크)
        Phase 5: @learn_optim(LGB) ║ @learn_optim(XGB) ║ @learn_optim(CAT)
```

## 병렬 실행

comp_orch는 독립적인 작업을 **동시에** 실행:

```
# 순차 실행 (느림)
@insight EDA 해줘 → 완료 대기 → @quick_task 파일 확인 → 완료 대기

# 병렬 실행 (빠름)  
@insight EDA 해줘        ─┐
@quick_task 파일 확인    ─┼─→ 둘 다 완료 후 다음 단계
```

## MCP 툴 활용

| MCP | 용도 | 예시 |
|-----|------|------|
| exa_search | 웹 검색 | 대회 디스커션, 솔루션 블로그 |
| context7 | 공식 문서 | sklearn, lightgbm API 참조 |
| gh_grep | GitHub 검색 | 유사 대회 코드, 베이스라인 |

## 워크플로우

```
┌─────────────────────────────────────────────────────────────┐
│                      comp_orch (GLM-4.7)                    │
│                     오케스트레이터                            │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   comp_plan     │ │    insight      │ │  learn_optim    │
│  GPT-5.2 Codex  │ │  Gemini 3 Pro   │ │  GPT-5.2 Codex  │
│   전략 수립      │ │  데이터 분석     │ │   모델 최적화    │
└─────────────────┘ └─────────────────┘ └─────────────────┘
          │                   │                   │
          └───────────────────┴───────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   quick_task    │
                    │  GLM-4.7-Flash  │
                    │   빠른 작업      │
                    └─────────────────┘
```

## 툴

### 대회 정보
- `fetch_competition`: 대회 정보 스크래핑
- `fetch_leaderboard`: 리더보드 조회
- `fetch_baseline`: 베이스라인 코드 조회

### 실험 관리
- `log_experiment`: 실험 기록
- `get_experiments`: 실험 히스토리 조회
- `compare_experiments`: 실험 비교
- `create_submission`: 제출 파일 생성

## 예시 세션

```
User: @comp_orch https://www.kaggle.com/competitions/titanic 분석해줘

comp_orch: 🎯 대회 분석을 시작합니다.

@comp_plan에게 위임: 대회 규칙 및 평가 지표 분석
@insight에게 위임: 초기 EDA 수행
@quick_task에게 위임: 리더보드 현황 확인

[분석 결과 종합]

📊 Competition Status Report
============================
Competition: Titanic - Machine Learning from Disaster
Platform: Kaggle
Evaluation: Accuracy
Timeline: Ongoing (practice competition)

전략 제안:
1. EDA Phase (Day 1)
   - 생존자 특성 분석
   - 결측치 처리 전략 수립
   
2. Feature Engineering (Day 2-3)
   - Title 추출, Family size, Cabin deck
   
3. Model Selection (Day 4-5)
   - LightGBM, XGBoost, CatBoost 비교
   
4. Ensemble (Day 6-7)
   - Voting/Stacking ensemble

다음 단계로 @insight에게 EDA를 시작하도록 할까요?
```

## 설정 커스터마이징

`~/.config/opencode/opencode-kaggle-comp.json`:
```json
{
  "agents": {
    "comp_plan": {
      "model": "openai/gpt-5.2-codex",
      "temperature": 0.3
    },
    "insight": {
      "model": "google/gemini-3-pro",
      "temperature": 0.4
    }
  },
  "experiment_log_path": "./experiments.jsonl",
  "auto_backup": true
}
```

## 라이선스

MIT
