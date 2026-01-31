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

### Quick Install (Recommended)

```bash
# bunx (권장)
bunx opencode-competition install

# 또는 npx
npx opencode-competition install

# 글로벌 설치
bunx opencode-competition install --global
```

### Manual Install

```bash
# npm 글로벌 설치
npm install -g opencode-competition

# 실행
opencode-competition install
```

### Verify Installation

```bash
bunx opencode-competition doctor
```

---

## Usage

### 1. 완전 자동화 모드

OpenCode에서 대회 URL만 입력:

```
https://www.kaggle.com/competitions/titanic
```

comp_orch가 자동으로:
1. 대회 정보 수집 (MCP: exa_search)
2. 전략 수립 (@comp_plan)
3. **병렬** EDA (@insight + @quick_task)
4. Feature Engineering
5. **병렬** 모델 학습 (LGB + XGB + CAT)
6. Optuna 하이퍼파라미터 튜닝
7. 앙상블 최적화
8. submission.csv 생성

**질문 없음. 확인 없음. 자동 완료.**

### 2. Tab 키로 에이전트 전환

```
[comp_orch] ← Tab → [comp_plan]
  완전 자동화        전략만 보기
```

### 3. 서브에이전트 직접 호출

```
@insight train.csv EDA 해줘
@learn_optim LightGBM 튜닝 해줘
@quick_task submission 검증해줘
```

---

## Agents

| Agent | Role | Model | Mode |
|-------|------|-------|------|
| `comp_orch` | 오케스트레이터 | GLM-4.7 | Primary |
| `comp_plan` | 전략 수립 | GPT-5.2 | Primary |
| `insight` | 데이터 분석 | Gemini 3 Pro | Subagent |
| `learn_optim` | 모델 학습 | GPT-5.2 | Subagent |
| `quick_task` | 빠른 검증 | GLM-4.7-Flash | Subagent |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 comp_orch (GLM-4.7)                         │
│                 Orchestrator + MCP                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ MCP: exa_search | context7 | gh_grep               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  comp_plan    │   │   insight     │   │ learn_optim   │
│  Strategy     │   │   Analysis    │   │  Modeling     │
└───────────────┘   └───────────────┘   └───────────────┘
                              │
                    ┌─────────────────┐
                    │   quick_task    │
                    │   Validation    │
                    └─────────────────┘
```

---

## MCP Configuration (Optional)

MCP 설정으로 웹 검색, 문서 조회, GitHub 검색 활성화:

```json
// opencode.json
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

## Pipeline Output

```
🏆 COMPETITION PIPELINE COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Model Performance:
┌─────────────┬──────────┬──────────┐
│ Model       │ CV Score │ Weight   │
├─────────────┼──────────┼──────────┤
│ LightGBM    │ 0.8654   │ 0.35     │
│ XGBoost     │ 0.8621   │ 0.35     │
│ CatBoost    │ 0.8598   │ 0.30     │
├─────────────┼──────────┼──────────┤
│ Ensemble    │ 0.8701   │ -        │
└─────────────┴──────────┴──────────┘

📁 Files Generated:
├── submission.csv  ✅
├── models/*.pkl
└── experiments.jsonl

🎯 Ready to submit!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Inspired By

- [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) - The original OpenCode plugin ecosystem

---

## License

MIT
