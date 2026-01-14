---
description: Tools for verifying, updating, and analyzing GTFS and Transport Data.
---

# Transport Data Skill

This skill provides utilities for managing the transport data stack (GTFS, API metadata, Schedules) for BusTrainGerzat.

## Scripts

All scripts are located in `.agent/skills/transport-data/scripts/`.

### 1. Check GTFS Updates

Checks if the local GTFS data needs to be updated.

```bash
python .agent/skills/transport-data/scripts/check_gtfs_update.py
```

### 2. Verify Schedule

Verifies schedule integrity against the official schedule.

```bash
python .agent/skills/transport-data/scripts/verify_schedule.py
```

### 3. Dump Official Schedule

Dumps the official schedule for comparison.

```bash
python .agent/skills/transport-data/scripts/dump_official_schedule.py
```

### 4. Analyze Patural

Specific analysis for Patural stops/lines.

```bash
python .agent/skills/transport-data/scripts/analyze_patural.py
```

### 5. Generate E1 Stop Times

Generates stop times for E1 line.

```bash
python .agent/skills/transport-data/scripts/generate_e1_stop_times.py
```

### 6. Verify API Metadata

Verifies that the API metadata is correct.

```bash
python .agent/skills/transport-data/scripts/verify_api_metadata.py
```

### 7. Extract Line E1 Data

Extracts map data for Line E1.

```bash
python .agent/skills/transport-data/scripts/extract_lineE1_data.py
```

### 8. Generate Static JSON

Generates the static bus schedule JSON from GTFS.

```bash
python .agent/skills/transport-data/scripts/generate_static_json.py
```

### 9. Generate Train Static

Generates the static train schedule from GTFS.

```bash
python .agent/skills/transport-data/scripts/generate_train_static.py
```
