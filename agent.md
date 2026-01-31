# Agent Development Guide

ML 경진대회 우승을 위한 OpenCode 플러그인 개발 가이드

---

## 프로젝트 비전

**opencode-competition** - oh-my-opencode 스타일의 ML 경진대회 전용 에이전트 오케스트레이션 플러그인

```
bunx opencode-competition install
```

한 줄 명령으로 설치하고, Kaggle/Dacon URL만 입력하면 submission.csv까지 자동 생성.

---

## 목표 패키지 구조

```
opencode-competition/
├── package.json              # npm 패키지 설정
├── bunfig.toml               # Bun 런타임 설정
├── tsconfig.json             # TypeScript 설정
│
├── bin/
│   └── cli.ts                # CLI 엔트리포인트 (bunx 실행)
│
├── src/
│   ├── index.ts              # 메인 모듈
│   ├── installer.ts          # 설치 로직 (.opencode/agent에 복사)
│   ├── commands/
│   │   ├── install.ts        # install 명령어
│   │   ├── uninstall.ts      # uninstall 명령어
│   │   └── doctor.ts         # 환경 진단
│   └── utils/
│       ├── config.ts         # opencode.json 관리
│       └── paths.ts          # 경로 유틸리티
│
├── agents/                   # 에이전트 정의 파일들
│   ├── comp_orch.md          # 오케스트레이터 (GLM-4.7)
│   ├── comp_plan.md          # 전략 수립 (GPT-5.2)
│   ├── insight.md            # 데이터 분석 (Gemini 3 Pro)
│   ├── learn_optim.md        # 모델 최적화 (GPT-5.2)
│   └── quick_task.md         # 빠른 태스크 (GLM-4.7-Flash)
│
├── templates/
│   └── opencode.json         # MCP 설정 템플릿
│
├── docs/
│   ├── installation.md
│   ├── agents.md
│   └── workflows.md
│
└── tests/
    └── installer.test.ts
```

---

## 핵심 package.json

```json
{
  "name": "opencode-competition",
  "version": "0.1.0",
  "description": "ML Competition Agent Orchestration Plugin for OpenCode",
  "type": "module",
  "bin": {
    "opencode-competition": "./bin/cli.js"
  },
  "main": "./dist/index.js",
  "files": [
    "dist",
    "bin",
    "agents"
  ],
  "scripts": {
    "build": "bun build ./src/index.ts --outdir ./dist",
    "dev": "bun run ./bin/cli.ts",
    "test": "bun test"
  },
  "keywords": [
    "opencode",
    "plugin",
    "kaggle",
    "ml",
    "competition",
    "agent"
  ],
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "chalk": "^5.3.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.0.0"
  }
}
```

---

## 개발 로드맵

### Phase 1: 기본 구조 (현재)

- [x] 에이전트 컨셉 설계 (comp_orch.md)
- [x] README 작성
- [x] MCP 설정 예시 (opencode.example.json)
- [ ] **agent.md 개발 가이드** ← 현재

### Phase 2: 패키지화

- [ ] package.json 생성
- [ ] CLI 구현 (bin/cli.ts)
- [ ] installer.ts 구현
  - .opencode/agent/ 디렉토리 생성
  - agents/*.md 파일 복사
  - opencode.json에 MCP 설정 머지
- [ ] 5개 에이전트 .md 파일 분리

### Phase 3: 에이전트 고도화

- [ ] comp_orch.md - MCP 통합 강화
- [ ] comp_plan.md - 전략 템플릿 추가
- [ ] insight.md - EDA 자동화 개선
- [ ] learn_optim.md - AutoML 통합
- [ ] quick_task.md - 유틸리티 확장

### Phase 4: 배포

- [ ] npm publish
- [ ] GitHub Releases
- [ ] 문서 사이트 (선택)

---

## 에이전트 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                    opencode-competition                          │
│                     (npm/bunx install)                           │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                 ~/.opencode/agent/ (또는 .opencode/agent/)       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                comp_orch (Primary)                       │   │
│   │                GLM-4.7 Orchestrator                      │   │
│   │                                                          │   │
│   │  - MCP: exa (웹검색), context7 (문서), gh_grep (GitHub)  │   │
│   │  - 병렬 서브에이전트 호출                                   │   │
│   │  - 완전 자동화 파이프라인                                   │   │
│   └─────────────────────────────────────────────────────────┘   │
│                               │                                  │
│       ┌───────────────────────┼───────────────────────┐         │
│       │                       │                       │         │
│       ▼                       ▼                       ▼         │
│  ┌──────────┐          ┌──────────┐          ┌──────────┐       │
│  │comp_plan │          │ insight  │          │learn_optim│      │
│  │GPT-5.2   │          │Gemini 3  │          │ GPT-5.2  │       │
│  │전략 수립  │          │데이터분석 │          │모델최적화 │       │
│  └──────────┘          └──────────┘          └──────────┘       │
│       │                       │                       │         │
│       └───────────────────────┴───────────────────────┘         │
│                               │                                  │
│                               ▼                                  │
│                        ┌──────────┐                             │
│                        │quick_task│                             │
│                        │GLM-Flash │                             │
│                        │빠른 검증  │                             │
│                        └──────────┘                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## CLI 명령어 설계

```bash
# 설치 (프로젝트 또는 글로벌)
bunx opencode-competition install [--global]

# 제거
bunx opencode-competition uninstall

# 환경 진단
bunx opencode-competition doctor

# MCP 설정만 추가
bunx opencode-competition setup-mcp

# 버전 확인
bunx opencode-competition --version
```

### install 동작

1. 현재 디렉토리에 `.opencode/agent/` 생성
2. 5개 에이전트 .md 파일 복사
3. `opencode.json` 존재 시 MCP 설정 머지 제안
4. 설치 완료 메시지 출력

---

## 경쟁력 차별화 포인트

### 1. 완전 자동화
```
URL 입력 → 분석 → EDA → FE → 학습 → 앙상블 → submission.csv
```
질문 없이, 확인 없이, 끝까지 실행.

### 2. 병렬 에이전트 실행
독립적인 작업은 동시에 실행하여 시간 단축.

### 3. MCP 통합
- exa: 실시간 웹 검색 (대회 정보, 디스커션)
- context7: 공식 라이브러리 문서
- gh_grep: GitHub에서 솔루션 코드 검색

### 4. 멀티 모델 오케스트레이션
| Task | Model | Why |
|------|-------|-----|
| 오케스트레이션 | GLM-4.7 | 저렴하고 빠름 |
| 전략/코딩 | GPT-5.2 | 코드 품질 |
| 분석/시각화 | Gemini 3 | 멀티모달 |
| 빠른 작업 | GLM-Flash | 초저지연 |

---

## 개발 시 참고사항

### OpenCode 에이전트 파일 형식

```yaml
---
description: "에이전트 설명"
model: provider/model-name
mode: primary | subagent
temperature: 0.0-1.0

tools:
  tool_name: true | false

permission:
  task:
    - "agent_name:allow"
---

에이전트 시스템 프롬프트 (Markdown)
```

### oh-my-opencode 참고 패턴

1. **installer.ts**: 사용자의 .opencode/agent에 파일 복사
2. **config merger**: 기존 opencode.json과 MCP 설정 병합
3. **standalone binary**: Bun으로 크로스 플랫폼 바이너리 빌드
4. **doctor command**: 환경 진단 및 트러블슈팅

---

## 즉시 실행 가능한 다음 단계

### Step 1: 에이전트 파일 분리
```bash
mkdir -p agents
# comp_orch.md는 이미 있음, 나머지 4개 생성
```

### Step 2: package.json 생성
```bash
bun init
# 위 설정대로 수정
```

### Step 3: CLI 구현
```typescript
// bin/cli.ts
import { Command } from 'commander';
import { install } from '../src/commands/install';

const program = new Command();
program
  .name('opencode-competition')
  .version('0.1.0')
  .description('ML Competition Agent Plugin for OpenCode');

program
  .command('install')
  .description('Install competition agents')
  .option('-g, --global', 'Install globally')
  .action(install);

program.parse();
```

### Step 4: 테스트 및 배포
```bash
# 로컬 테스트
bun run bin/cli.ts install

# npm 배포
npm publish
```

---

## 경진대회 우승 전략 통합

이 플러그인의 최종 목표는 **경진대회 자동화**:

1. **정보 수집 자동화**: MCP로 대회 규칙, 디스커션, 솔루션 검색
2. **EDA 자동화**: insight 에이전트가 데이터 분석 리포트 생성
3. **모델링 자동화**: learn_optim이 여러 모델 병렬 학습
4. **앙상블 자동화**: 최적 가중치 자동 탐색
5. **제출 자동화**: submission.csv 생성

**목표: URL 입력 후 30분 내 첫 submission 생성**

---

## 참고 자료

- [oh-my-opencode GitHub](https://github.com/code-yeongyu/oh-my-opencode)
- [OpenCode Plugins Docs](https://opencode.ai/docs/plugins/)
- [awesome-opencode](https://github.com/awesome-opencode/awesome-opencode)

---

*Last Updated: 2026-01-31*
