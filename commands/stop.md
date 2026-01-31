---
description: "Competition loop 중단"
---

🛑 **COMPETITION LOOP STOPPED**

---

## Final Summary

Read `experiments.jsonl` and provide:

1. **Statistics**:
   - Total iterations completed
   - Best score achieved (and which iteration)
   - Final score
   - Total improvement from baseline

2. **Best Configuration**:
   - Model parameters that achieved best score
   - Features that were most impactful
   - Key insights learned

3. **Experiment History** (last 5):
   ```
   | Iter | Hypothesis | Score | Result |
   |------|-----------|-------|--------|
   | ... | ... | ... | ... |
   ```

4. **Files Generated**:
   - List all submission files
   - List all model files
   - Point to best submission

---

## Output Format

```
🛑 COMPETITION LOOP STOPPED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Summary:
   Iterations: N
   Best Score: X.XXXX (iteration M)
   Final Score: Y.YYYY
   Improvement: +Z.ZZZZ from baseline

🏆 Best Configuration:
   Model: [best model]
   Key Params: [important params]
   Key Features: [impactful features]

📁 Files:
   └── submissions/submission_best_X.XXXX.csv ← Use this!

📝 Experiments saved: experiments.jsonl
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Loop is now stopped. Provide the summary above.
