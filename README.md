# opencode-competition

> ML 경진대회 우승을 위한 OpenCode 에이전트 오케스트레이션 플러그인

[![npm version](https://img.shields.io/npm/v/opencode-competition)](https://www.npmjs.com/package/opencode-competition)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**URL 하나로 Kaggle/Dacon 대회 자동 분석부터 submission.csv 생성까지!**

```bash
# 설치
bunx opencode-competition install

# 사용 (OpenCode에서)
https://www.kaggle.com/competitions/titanic
```

---

## Features

- **Zero-Interaction Automation** - URL만 입력하면 끝까지 자동 실행
- **Parallel Agents** - 독립 작업 병렬 처리로 시간 단축
- **MCP Integration** - 웹 검색, 문서 조회, GitHub 코드 검색
- **Multi-Model Orchestration** - 작업별 최적 모델 자동 선택
- **Experiment Tracking** - 모든 실험 자동 기록

---

## Installation

```bash
# bunx (권장)
bunx opencode-competition install

# 또는 npx
npx opencode-competition install

# 글로벌 설치 (모든 프로젝트에서 사용)
bunx opencode-competition install --global

# 설치 확인
bunx opencode-competition doctor
```

---

## Agents Overview

| Agent | Mode | Model | 용도 | 언제 사용? |
|-------|------|-------|-----|-----------|
| `comp_orch` | **Primary** | GLM-4.7 | 전체 파이프라인 자동화 | URL 입력 시 자동 실행 |
| `comp_plan` | **Primary** | GPT-5.2 | 전략 수립, 분석 | 전략만 보고 싶을 때 |
| `insight` | Subagent | Gemini 3 Pro | EDA, 시각화, FE | 데이터 분석 필요 시 |
| `learn_optim` | Subagent | GPT-5.2 | 모델 학습, 튜닝 | 모델링 필요 시 |
| `quick_task` | Subagent | GLM-4.7-Flash | 빠른 검증, 유틸 | 간단한 작업 시 |

### Primary vs Subagent

- **Primary (Tab 전환)**: OpenCode에서 `Tab` 키로 선택 가능
- **Subagent (@호출)**: Primary 에이전트가 `@agent_name`으로 호출

---

## Usage Guide

### 1. 완전 자동화 모드 (comp_orch)

**가장 권장하는 방식!** URL만 입력하면 submission.csv까지 자동 생성.

```
# OpenCode 실행 후 Tab 키로 comp_orch 선택

┌─────────────────────────────────────────────────┐
│ opencode                                         │
│                                                  │
│ Agent: [comp_orch] ← Tab으로 선택               │
│                                                  │
│ > https://www.kaggle.com/competitions/titanic   │
└─────────────────────────────────────────────────┘
```

**입력:**
```
https://www.kaggle.com/competitions/titanic
```

**또는 한국어로:**
```
타이타닉 대회 풀어줘
```

**comp_orch가 자동으로 실행하는 파이프라인:**
```
Phase 0: Setup
├── workspace 폴더 생성
└── 데이터 다운로드 (kaggle API)

Phase 1: Intelligence
├── MCP: exa_search로 대회 정보 검색
├── MCP: gh_grep으로 기존 솔루션 검색
└── @comp_plan: 전략 수립

Phase 2: Data Understanding (병렬)
├── @insight: 전체 EDA 수행
└── @quick_task: 파일 검증

Phase 3: Feature Engineering
├── MCP: context7로 라이브러리 문서 확인
└── @insight: 피처 생성

Phase 4: Baseline
└── @learn_optim: LightGBM baseline

Phase 5: Optimization (병렬)
├── @learn_optim: LightGBM 튜닝
├── @learn_optim: XGBoost 튜닝
└── @learn_optim: CatBoost 튜닝

Phase 6: Ensemble
├── @learn_optim: 앙상블 최적화
├── @quick_task: submission 검증
└── submission.csv 생성 ✅
```

### 2. 전략만 먼저 보기 (comp_plan)

대회 분석과 전략만 확인하고 싶을 때:

```
# Tab 키로 comp_plan 선택

┌─────────────────────────────────────────────────┐
│ Agent: [comp_plan] ← Tab으로 선택               │
│                                                  │
│ > https://www.kaggle.com/competitions/titanic   │
│   분석해줘                                       │
└─────────────────────────────────────────────────┘
```

**출력 예시:**
```markdown
# 🎯 Competition Battle Plan

## Overview
| Item | Value |
|------|-------|
| Name | Titanic |
| Metric | Accuracy |
| Type | Binary Classification |

## Winning Strategy
### Phase 1: Baseline (Day 1)
- LightGBM default → 0.77 예상

### Phase 2: Feature Engineering (Day 2-4)
- Title 추출 (Mr, Mrs, Miss)
- Family size = SibSp + Parch + 1
- Cabin deck (첫 글자)

### Phase 3: Model Optimization (Day 5-7)
- Optuna 튜닝 100 trials
- Expected: 0.80+
```

### 3. 서브에이전트 직접 호출

특정 작업만 필요할 때 Primary 에이전트에서 `@`로 호출:

```
# comp_orch 또는 comp_plan에서

> @insight train.csv EDA 해줘
> @learn_optim LightGBM Optuna로 튜닝해줘
> @quick_task submission.csv 검증해줘
```

---

## Detailed Usage Scenarios

### Scenario 1: 새 대회 시작 (처음부터 끝까지)

```
1. OpenCode 실행
2. Tab → comp_orch 선택
3. 대회 URL 입력

입력: https://www.kaggle.com/competitions/playground-series-s4e1

→ 자동으로 전체 파이프라인 실행
→ 30분~1시간 후 submission.csv 생성
```

### Scenario 2: 전략만 먼저 검토

```
1. OpenCode 실행
2. Tab → comp_plan 선택
3. 대회 URL + "분석해줘"

입력: https://dacon.io/competitions/official/236230 분석해줘

→ 대회 분석 리포트 출력
→ 전략 및 예상 점수 확인
→ 이후 comp_orch로 전환하여 실행
```

### Scenario 3: 데이터만 분석

```
1. comp_orch 또는 comp_plan에서
2. @insight 호출

입력: @insight train.csv, test.csv 전체 EDA 해줘

→ 데이터 통계, 분포, 결측치, 상관관계 분석
→ 시각화 포함 리포트 출력
```

### Scenario 4: 특정 모델만 튜닝

```
1. comp_orch에서 @learn_optim 호출

입력: @learn_optim XGBoost Optuna 100 trials로 튜닝해줘

→ XGBoost 하이퍼파라미터 최적화
→ Best params 및 CV score 출력
```

### Scenario 5: submission 검증

```
1. @quick_task 호출

입력: @quick_task submission.csv 검증해줘

→ 포맷, 컬럼, 값 범위 검증
→ sample_submission과 비교
```

---

## Expected Flow: Titanic 예시

```
┌────────────────────────────────────────────────────────────────┐
│ 입력: https://www.kaggle.com/competitions/titanic              │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ Phase 1: Competition Intelligence                               │
│                                                                 │
│ [MCP] exa_search("kaggle titanic winning solution")            │
│ → 상위 솔루션 정보 수집                                          │
│                                                                 │
│ [@comp_plan] 대회 분석                                          │
│ → Metric: Accuracy                                              │
│ → Type: Binary Classification                                   │
│ → Key Features: Pclass, Sex, Age, Fare                         │
│ → 예상 상위권: 0.80+                                            │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ Phase 2: Data Understanding (병렬 실행)                         │
│                                                                 │
│ [@insight]                    │  [@quick_task]                  │
│ - 891 rows, 12 cols          │  - train.csv ✓                  │
│ - Target: Survived (0/1)     │  - test.csv ✓                   │
│ - 결측: Age 20%, Cabin 77%   │  - sample_submission.csv ✓      │
│ - 상관관계 분석               │  - 컬럼 일치 확인               │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ Phase 3: Feature Engineering                                    │
│                                                                 │
│ [MCP] gh_grep("titanic feature engineering python")            │
│ → GitHub에서 FE 아이디어 수집                                    │
│                                                                 │
│ [@insight] 피처 생성                                            │
│ → Title: Mr, Mrs, Miss, Master 등                              │
│ → FamilySize: SibSp + Parch + 1                                │
│ → IsAlone: FamilySize == 1                                     │
│ → Deck: Cabin 첫 글자                                           │
│ → AgeBin: 연령대 구간화                                         │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ Phase 4: Baseline Model                                         │
│                                                                 │
│ [MCP] context7("lightgbm LGBMClassifier parameters")           │
│ → 파라미터 문서 확인                                             │
│                                                                 │
│ [@learn_optim] LightGBM Baseline                                │
│ → 5-Fold StratifiedKFold                                       │
│ → CV Score: 0.8215 (±0.015)                                    │
│ → OOF predictions 저장                                          │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ Phase 5: Model Optimization (병렬 실행)                         │
│                                                                 │
│ [@learn_optim]      [@learn_optim]      [@learn_optim]         │
│ LightGBM            XGBoost             CatBoost               │
│ Optuna 50 trials    Optuna 50 trials    Optuna 50 trials       │
│                                                                 │
│ CV: 0.8342          CV: 0.8298          CV: 0.8265             │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ Phase 6: Ensemble & Submit                                      │
│                                                                 │
│ [@learn_optim] 앙상블 최적화                                    │
│ → Weights: LGB=0.4, XGB=0.35, CAT=0.25                         │
│ → Ensemble CV: 0.8401                                          │
│                                                                 │
│ [@quick_task] Submission 검증                                   │
│ → 418 rows ✓                                                    │
│ → No NaN ✓                                                      │
│ → Values in [0,1] ✓                                            │
│                                                                 │
│ 📁 submission.csv 생성 완료!                                    │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ 🏆 PIPELINE COMPLETE                                            │
│                                                                 │
│ 📊 Results:                                                     │
│ ┌─────────────┬──────────┬──────────┐                          │
│ │ Model       │ CV Score │ Weight   │                          │
│ ├─────────────┼──────────┼──────────┤                          │
│ │ LightGBM    │ 0.8342   │ 0.40     │                          │
│ │ XGBoost     │ 0.8298   │ 0.35     │                          │
│ │ CatBoost    │ 0.8265   │ 0.25     │                          │
│ ├─────────────┼──────────┼──────────┤                          │
│ │ Ensemble    │ 0.8401   │ -        │                          │
│ └─────────────┴──────────┴──────────┘                          │
│                                                                 │
│ 📁 Generated: submission.csv                                    │
│ 🎯 Submit: kaggle competitions submit -f submission.csv        │
└────────────────────────────────────────────────────────────────┘
```

---

## Agent Selection Guide

### 언제 어떤 에이전트를 사용할까?

| 상황 | 사용할 에이전트 | 방법 |
|-----|---------------|------|
| 대회 처음 시작, 자동으로 다 해줘 | `comp_orch` | Tab → comp_orch → URL 입력 |
| 전략만 먼저 보고 싶어 | `comp_plan` | Tab → comp_plan → URL + "분석해줘" |
| 데이터 분석/시각화만 | `@insight` | Primary에서 @insight 호출 |
| 모델 학습/튜닝만 | `@learn_optim` | Primary에서 @learn_optim 호출 |
| 파일 체크, 간단한 작업 | `@quick_task` | Primary에서 @quick_task 호출 |

### Tab 키로 Primary Agent 전환

```
OpenCode에서 Tab 키를 누르면:

┌─────────────────────────────────────────┐
│  Select Agent                           │
│                                         │
│  > comp_orch   (완전 자동화)            │
│    comp_plan   (전략 수립)              │
│    default     (기본 에이전트)          │
└─────────────────────────────────────────┘
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      comp_orch (GLM-4.7)                         │
│                    [Primary - Tab 선택]                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ MCP Tools (직접 사용)                                       │ │
│  │ • exa_search - 웹 검색 (대회 정보, 솔루션)                  │ │
│  │ • context7 - 라이브러리 공식 문서                           │ │
│  │ • gh_grep - GitHub 코드 검색                                │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │ @comp_plan          │ @insight            │ @learn_optim
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  comp_plan    │   │   insight     │   │ learn_optim   │
│  [Primary]    │   │  [Subagent]   │   │  [Subagent]   │
│               │   │               │   │               │
│  GPT-5.2      │   │  Gemini 3 Pro │   │   GPT-5.2     │
│  전략 수립     │   │  데이터 분석   │   │  모델 최적화   │
│  규칙 분석     │   │  EDA, FE      │   │  튜닝, 앙상블  │
└───────────────┘   └───────────────┘   └───────────────┘
        │                     │                     │
        └─────────────────────┴─────────────────────┘
                              │ @quick_task
                              ▼
                    ┌─────────────────┐
                    │   quick_task    │
                    │   [Subagent]    │
                    │                 │
                    │  GLM-4.7-Flash  │
                    │  빠른 검증       │
                    │  유틸리티 작업   │
                    └─────────────────┘
```

---

## MCP Configuration (Optional)

MCP를 설정하면 웹 검색, 문서 조회, GitHub 검색이 가능합니다:

```json
// opencode.json (프로젝트 루트 또는 ~/.config/opencode/)
{
  "mcp": {
    "exa": {
      "type": "local",
      "command": ["npx", "-y", "@anthropic/mcp-exa"],
      "enabled": true,
      "environment": {
        "EXA_API_KEY": "your-api-key"
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

---

## CLI Commands

```bash
# 에이전트 설치
bunx opencode-competition install [--global]

# 에이전트 제거
bunx opencode-competition uninstall [--global]

# 환경 진단
bunx opencode-competition doctor

# 버전 확인
bunx opencode-competition --version
```

---

## Competition Loop Mode

목표 점수/순위에 도달할 때까지 자동으로 반복 실험하는 모드입니다.

### Activation

```
# Score target
"cv 0.85 넘을 때까지 반복해"
"until score > 0.9"

# Rank target
"top10 들어갈 때까지 진행해"
"until top 5"

# Open-ended
"계속 개선해"
```

### Loop Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Iteration N                                                  │
├─────────────────────────────────────────────────────────────┤
│ 1. 📝 Hypothesis: "Target encoding will improve score"      │
│ 2. 🔧 Execute: Apply changes, train models                  │
│ 3. 📊 Measure: CV score = 0.8542                           │
│ 4. 📈 Analyze: +0.0047 improvement, encoding worked         │
│ 5. 💡 Learn: Continue this direction                        │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
      [Score improved?]               [Target reached?]
              │                               │
     ┌────────┴────────┐             ┌────────┴────────┐
     │ YES             │ NO          │ YES             │ NO
     ▼                 ▼             ▼                 ▼
  Continue        Rollback &     🏆 DONE!        Next Iter
  direction      try alternative
```

### Iteration Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 ITERATION 7 COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Hypothesis: "Higher max_depth for XGBoost"
📊 Results: 0.8542 → 0.8589 (+0.55%) ✅ IMPROVED

💡 Analysis:
   - Tree depth increase helped capture patterns
   - Watch for overfitting

🔮 Next: Add regularization, try feature interactions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Progress: 7/50 | Best: 0.8589 | Target: 0.8800
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Stop Commands

```
중단 / 멈춰 / stop / /stop / /cancel
```

---

## Slash Commands

설치 후 OpenCode에서 사용 가능한 커맨드:

| Command | Description | Example |
|---------|-------------|---------|
| `/loop <target>` | 목표까지 반복 실험 | `/loop cv 0.85` |
| `/stop` | 루프 중단 | `/stop` |
| `/status` | 현재 상태 확인 | `/status` |
| `/experiment <hyp>` | 단일 실험 실행 | `/experiment Add target encoding` |
| `/dashboard` | 경진대회 대시보드 | `/dashboard` |
| `/usage` | 구독 사용량 표시 | `/usage` |

```bash
# Score 목표
/loop cv 0.85
/loop score > 0.9

# Rank 목표
/loop top10
/loop 상위 5등

# 단일 실험
/experiment Higher max_depth for XGBoost
```

---

## Dashboard

claude-dashboard 스타일의 실시간 경진대회 상태 대시보드입니다.

### Dashboard View

`/dashboard` 명령으로 전체 대시보드를 볼 수 있습니다:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊 COMPETITION DASHBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Status
    ● Loop: ACTIVE
    📍 Iteration: 7 / 50
    [██████░░░░░░░░░░░░░░░░░░░] 14%

  Scores
    Current:  0.85420
    Best:     0.85890 (iter 6)
    Target:   0.88000
    Gap:      0.02110 (2.4%)
    Progress: [▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░] 98%

  Trend
    📈 Improving

  Recent Experiments
    ✓ #5 Add target encoding... → 0.8542
    ✓ #6 Tune max_depth... → 0.8589
    ✗ #7 Add lag features... → 0.8521

  Time
    Started:  2024-01-15 10:30:00
    Duration: 45m 23s

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Dashboard Components

| Component | Description |
|-----------|-------------|
| **Status** | Loop 상태 (Active/Stopped), 현재 반복 횟수 |
| **Scores** | 현재/최고/목표 점수, 목표까지 Gap |
| **Trend** | 최근 5개 실험 기반 추세 (Improving/Plateau/Degrading) |
| **Recent** | 마지막 3개 실험 결과 |
| **Time** | 시작 시간, 경과 시간 |

### Progress Bars

점수와 진행률에 따라 색상이 자동으로 변경됩니다:

- 🟢 **Green**: 80%+ 진행 또는 95%+ 목표 달성
- 🟡 **Yellow**: 50-80% 진행 또는 85-95% 목표 달성
- 🔴 **Red/Cyan**: 50% 미만 진행

### Statusline Plugin

`competition-statusline.ts` 플러그인은 다음 기능을 제공합니다:

```typescript
// 컴팩트 상태표시줄 (터미널 하단)
🔄 7/50 | 0.8542 (best: 0.8589)

// 전체 상태표시줄
🔄 LOOP │ Iter 7/50 │ Score 0.8542 │ Best 0.8589 │ 📈 Improving │ ⏱ 45m
```

---

## Subscription Usage

AI 제공업체 구독 플랜 사용량을 실시간으로 추적합니다.

### Supported Providers

| Provider | Icon | Limits Tracked |
|----------|------|----------------|
| **Claude** | 🟣 | 5h limit, 7d limit (Max) |
| **Codex/OpenAI** | 🟢 | RPM, TPM |
| **Gemini** | 🔵 | RPM, Daily quota |
| **GLM/ZHIPU** | 🟡 | Daily quota |

### Usage View

`/usage` 명령으로 전체 사용량 대시보드를 볼 수 있습니다:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📈 SUBSCRIPTION USAGE DASHBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  🟣 Claude
    Plan: MAX
    5h Limit:  [███████░░░░░░░░░░░░░] 35%
               65,000 / 100,000 tokens remaining
               Resets in 2h 30m
    7d Limit:  [██░░░░░░░░░░░░░░░░░░] 12%
               Resets in 5d

  🟢 Codex
    Plan: PRO
    RPM:       [█████████░░░░░░░░░░░] 45%
               550 / 1000 requests remaining
    TPM:       [██████░░░░░░░░░░░░░░] 28%
               72K / 100K tokens remaining

  🔵 Gemini
    Plan: PRO
    RPM:       [████░░░░░░░░░░░░░░░░] 20%
    Daily:     [██░░░░░░░░░░░░░░░░░░] 8%
               Resets in 16h

  🟡 GLM
    Plan: PRO
    Daily:     [███░░░░░░░░░░░░░░░░░] 15%
               85,000 / 100,000 remaining
               Resets in 10h

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Compact Statusline

CLI 입력창 하단에 표시되는 컴팩트 상태표시줄:

```
🟣35% 🟢45% 🔵20% 🟡15%
```

전체 상태표시줄:

```
🟣 Claude 5h: [███░░░░░░░] 35% (2h 30m) │ 7d: [█░░░░░░░] 12% (5d)
🟢 Codex RPM: 550/1000 TPM: 72K/100K
🔵 Gemini RPM: 20% Daily: 8% (16h)
🟡 GLM Daily: 15% (10h)
```

### Color Coding

사용량에 따른 색상 코딩:

- 🟢 **Green**: 0-50% (안전)
- 🟡 **Yellow**: 51-80% (주의)
- 🔴 **Red**: 81-100% (위험)

### Credential Configuration

각 제공업체별 인증 설정 방법:

#### Claude (Anthropic)
```bash
# 방법 1: 크레덴셜 파일 (자동 생성됨)
~/.claude/.credentials.json

# 방법 2: 환경 변수
export ANTHROPIC_AUTH_TOKEN="your-oauth-token"

# 방법 3: macOS Keychain (자동 감지)
```

**API Endpoint**: `https://api.anthropic.com/api/oauth/usage`

#### Codex (OpenAI)
```bash
# 방법 1: 인증 파일
~/.codex/auth.json
# 내용:
{
  "accessToken": "your-access-token",
  "accountId": "your-account-id"
}

# 방법 2: 환경 변수
export OPENAI_ACCESS_TOKEN="your-access-token"
export OPENAI_ACCOUNT_ID="your-account-id"
```

**API Endpoint**: `https://chatgpt.com/backend-api/wham/usage`

#### Gemini (Google)
```bash
# 방법 1: OAuth 크레덴셜 파일
~/.gemini/oauth_creds.json
# 내용:
{
  "access_token": "your-access-token",
  "refresh_token": "your-refresh-token"
}

# 방법 2: 환경 변수
export GEMINI_ACCESS_TOKEN="your-access-token"

# 방법 3: macOS Keychain (자동 감지)
```

**API Endpoint**: `https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota`

#### GLM (ZHIPU/Z.ai)
```bash
# 방법 1: 설정 파일
~/.glm/config.json
# 내용:
{
  "authToken": "your-api-key",
  "baseUrl": "https://open.bigmodel.cn"  # optional
}

# 방법 2: 환경 변수
export GLM_AUTH_TOKEN="your-api-key"
# 또는
export ZHIPU_API_KEY="your-api-key"
export GLM_BASE_URL="https://open.bigmodel.cn"  # optional
```

**API Endpoint**: `{baseUrl}/api/monitor/usage/quota/limit`

---

## Quick Reference

```bash
# 1. 설치
bunx opencode-competition install

# 2. OpenCode 실행
opencode

# 3-A. Single Run (URL만)
https://www.kaggle.com/competitions/titanic

# 3-B. Loop Mode (목표까지 반복)
/loop cv 0.85
```

---

## Inspired By

- [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) - The original OpenCode plugin ecosystem
- [claude-dashboard](https://github.com/uppinote20/claude-dashboard) - Statusline UI inspiration

---

## License

MIT
