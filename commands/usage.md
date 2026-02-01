---
description: "Subscription usage - AI 구독 플랜 사용량 표시"
---

📈 **SUBSCRIPTION USAGE**

---

Display AI provider subscription usage (Claude, Codex, Gemini, GLM).

## Supported Providers

| Provider | Plan Types | Limits Tracked |
|----------|-----------|----------------|
| **Claude** | Free, Pro, Max | 5h limit, 7d limit (Max only) |
| **Codex/OpenAI** | Free, Plus, Pro | RPM, TPM |
| **Gemini** | Free, Pro | RPM, Daily quota |
| **GLM/ZHIPU** | Free, Pro | Daily quota |

---

## Usage Data Format

Read from `~/.cache/opencode-competition/usage-cache.json`:

```json
{
  "providers": {
    "claude": {
      "name": "Claude",
      "icon": "🟣",
      "plan": "max",
      "fiveHour": {
        "utilization": 35,
        "resetsAt": "2024-01-15T15:30:00Z",
        "remaining": 65000,
        "limit": 100000
      },
      "sevenDay": {
        "utilization": 12,
        "resetsAt": "2024-01-20T00:00:00Z"
      },
      "lastUpdated": "2024-01-15T10:30:00Z"
    },
    "codex": {
      "name": "Codex",
      "icon": "🟢",
      "plan": "pro",
      "rpm": {
        "utilization": 45,
        "remaining": 550,
        "limit": 1000
      },
      "tpm": {
        "utilization": 28,
        "remaining": 72000,
        "limit": 100000
      }
    }
  },
  "ttlSeconds": 60
}
```

---

## Output Format

### Statusline (compact)
```
🟣35% 🟢45% 🔵20% 🟡15%
```

### Statusline (full)
```
🟣 Claude 5h: [███░░░░░░░] 35% (2h 30m) │ 7d: [█░░░░░░░] 12% (5d)
🟢 Codex RPM: 550/1000 TPM: 72K/100K
🔵 Gemini RPM: 20% Daily: [█░░░░░░░░░] 8%
🟡 GLM Daily: [██░░░░░░░░] 15% (10h)
```

### Dashboard
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

---

## Color Coding

Progress bars and percentages are color-coded:

- 🟢 **Green**: 0-50% usage (safe zone)
- 🟡 **Yellow**: 51-80% usage (warning zone)
- 🔴 **Red**: 81-100% usage (critical zone)

---

## Refresh Usage Data

To get fresh usage data, the plugin fetches from provider APIs:
- Claude: Anthropic OAuth API
- OpenAI: Organization Usage API
- Gemini: Google AI Usage API
- GLM: ZHIPU API

Data is cached for 60 seconds to avoid excessive API calls.

---

Display the subscription usage dashboard.
