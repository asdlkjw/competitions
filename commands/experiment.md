---
description: "단일 실험 실행 및 기록"
---

🧪 **SINGLE EXPERIMENT**

Hypothesis: $ARGUMENTS

---

## Execute ONE Experiment

1. **Record Hypothesis**: "$ARGUMENTS"

2. **Execute**:
   - Apply the proposed change
   - Train model with current best config
   - Run CV evaluation

3. **Measure & Compare**:
   - Get CV score
   - Compare with previous best
   - Calculate delta

4. **Analyze**:
   - Why did it improve/degrade?
   - What can we learn?

5. **Log to experiments.jsonl**:
   ```json
   {
     "timestamp": "[now]",
     "hypothesis": "$ARGUMENTS",
     "cv_score": [score],
     "prev_best": [prev],
     "delta": [diff],
     "result": "improved/degraded/unchanged",
     "analysis": "[why]"
   }
   ```

6. **Decision**:
   - Improved → Keep changes, update best
   - Degraded → Rollback changes

---

## Output Format

```
🧪 EXPERIMENT COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Hypothesis: $ARGUMENTS

📊 Results:
   Previous: X.XXXX
   Current:  Y.YYYY
   Delta:    [+/-]Z.ZZZZ ([+/-]P.PP%)

📈 Verdict: [✅ IMPROVED / ❌ DEGRADED / ➡️ UNCHANGED]

💡 Analysis:
   [Why did this happen?]

🔧 Action Taken:
   [Kept changes / Rolled back]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Execute experiment: $ARGUMENTS
