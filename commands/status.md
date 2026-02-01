---
description: "Competition loop 현재 상태 확인"
---

📊 **COMPETITION LOOP STATUS**

---

Check current loop status by reading `.competition-loop-state.json` and `experiments.jsonl`.

## Report

1. **Loop State**:
   - Active: Yes/No
   - Current iteration
   - Target (score/rank)
   - Max iterations

2. **Progress**:
   - Best score so far
   - Best iteration
   - Current score
   - Gap to target

3. **Recent Experiments** (last 3):
   ```
   | Iter | Hypothesis | Score | Delta | Result |
   |------|-----------|-------|-------|--------|
   ```

4. **Trend Analysis**:
   - Improving / Stuck / Degrading
   - Suggested next action

---

## Output Format

```
📊 COMPETITION LOOP STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 Loop: [ACTIVE/STOPPED]
📍 Iteration: N / 50
🎯 Target: [target]

📈 Progress:
   Best:    X.XXXX (iter M)
   Current: Y.YYYY
   Gap:     Z.ZZZZ to target

📋 Recent:
   [iter] [hypothesis] → [score] [result]
   [iter] [hypothesis] → [score] [result]
   [iter] [hypothesis] → [score] [result]

💡 Trend: [IMPROVING/STUCK/DEGRADING]
   Suggestion: [next action]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Read the state files and report current status.
