---
description: "Competition loop - 목표 점수/순위 달성까지 자동 반복 실험"
---

🔄 **COMPETITION LOOP MODE ACTIVATED**

Target: $ARGUMENTS

---

## Loop Configuration

- **Target**: $ARGUMENTS
- **Max Iterations**: 50
- **Strategy**: Scientific experiment method

---

## Your Mission

1. **Parse Target**:
   - Score target: "0.85", "cv 0.9", "85%"
   - Rank target: "top10", "top 5"
   - Open-ended: "계속", "keep going"

2. **Execute Loop** until target reached:

```
ITERATION N:
├── 📝 State hypothesis (what will improve score?)
├── 🔧 Execute experiment (FE, tuning, ensemble)
├── 📊 Measure CV score
├── 📈 Analyze result vs previous
│   ├── Improved → Continue direction
│   └── Degraded → Rollback & try alternative
└── 💡 Update strategy
```

3. **Track Progress**:
   - Log all experiments to `experiments.jsonl`
   - Report iteration summary after each run
   - Show progress toward target

4. **Stop Conditions**:
   - Target score/rank achieved 🏆
   - Max iterations reached ⏹️
   - User says "중단" or "/stop" 🛑

---

## Output Format (After Each Iteration)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 ITERATION N COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Hypothesis: [what you tried]
📊 Results: [prev] → [current] ([+/-]%) [✅/❌]

💡 Analysis:
   - [what worked/failed and why]

🔮 Next:
   - [next experiment plan]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Progress: N/50 | Best: X.XXXX | Target: $ARGUMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Rules

1. **NO QUESTIONS** - Just execute
2. **TRACK EVERYTHING** - Log every experiment
3. **ANALYZE CHANGES** - Understand why score changed
4. **ROLLBACK ON FAILURE** - Don't lose progress
5. **KEEP GOING** - Until target or max iterations

---

Start iteration 1 NOW. Target: $ARGUMENTS
