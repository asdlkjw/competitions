---
description: "Competition dashboard - 전체 상태 대시보드 표시"
---

📊 **COMPETITION DASHBOARD**

---

Display the full competition dashboard with all metrics and progress.

## Dashboard Sections

### 1. Status
- Loop state (Active/Stopped)
- Current iteration / Max iterations
- Progress bar

### 2. Scores
- Current score
- Best score (with iteration number)
- Target score
- Gap to target
- Score progress bar

### 3. Trend Analysis
- Recent trend (Improving/Plateau/Degrading)
- Based on last 5 experiments

### 4. Recent Experiments
- Last 3 experiments with:
  - Iteration number
  - Hypothesis (truncated)
  - CV score
  - Result (improved/degraded/unchanged)

### 5. Time
- Start time
- Duration

---

## Reading State Files

1. Read `.competition-loop-state.json`:
   ```json
   {
     "active": true,
     "iteration": 5,
     "best_score": 0.8542,
     "best_iteration": 3,
     "current_score": 0.8521,
     "target_score": 0.88,
     "start_time": "2024-01-15T10:30:00Z"
   }
   ```

2. Read `experiments.jsonl` (last 3 lines):
   ```json
   {"iteration": 3, "hypothesis": "Add target encoding", "cv_score": 0.8542, "result": "improved"}
   {"iteration": 4, "hypothesis": "Tune LightGBM LR", "cv_score": 0.8535, "result": "degraded"}
   {"iteration": 5, "hypothesis": "Add lag features", "cv_score": 0.8521, "result": "degraded"}
   ```

---

## Output Format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊 COMPETITION DASHBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Status
    ● Loop: ACTIVE
    📍 Iteration: 5 / 50
    [████████░░░░░░░░░░░░░░░░░] 10%

  Scores
    Current:  0.85210
    Best:     0.85420 (iter 3)
    Target:   0.88000
    Gap:      0.02580 (2.9%)
    Progress: [▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░] 97%

  Trend
    📉 Degrading

  Recent Experiments
    ✓ #3 Add target encoding... → 0.8542
    ✗ #4 Tune LightGBM LR... → 0.8535
    ✗ #5 Add lag features... → 0.8521

  Time
    Started:  2024-01-15 10:30:00
    Duration: 45m 23s

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

Read the state files and display the dashboard.
