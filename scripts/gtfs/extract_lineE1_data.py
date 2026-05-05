#!/usr/bin/env python3
"""Extract Line E1 static map data from GTFS files."""

import csv
import json
from pathlib import Path

GTFS_DIR = Path("gtfs_data")
OUTPUT_FILE = Path("public/data/lineE1_data.json")
TARGET_ROUTE_NAMES = {"E1", "20"}


def read_csv(path: Path):
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        yield from csv.DictReader(f)


def main() -> None:
    routes = {}
    target_route_ids = set()

    for row in read_csv(GTFS_DIR / "routes.txt"):
        route = {
            "routeId": row["route_id"],
            "routeShortName": row["route_short_name"],
            "routeLongName": row.get("route_long_name", ""),
            "routeColor": row.get("route_color") or "fdc300",
        }
        routes[row["route_id"]] = route
        if row["route_short_name"] in TARGET_ROUTE_NAMES:
            target_route_ids.add(row["route_id"])

    if not target_route_ids:
        raise RuntimeError(f"Could not find route names: {sorted(TARGET_ROUTE_NAMES)}")

    route_id = sorted(target_route_ids)[0]
    route = routes[route_id]

    stops = {
        row["stop_id"]: {
            "stopId": row["stop_id"],
            "stopName": row["stop_name"],
            "lat": float(row["stop_lat"]),
            "lon": float(row["stop_lon"]),
        }
        for row in read_csv(GTFS_DIR / "stops.txt")
    }

    trips = {}
    trips_by_shape = {}

    for row in read_csv(GTFS_DIR / "trips.txt"):
        if row["route_id"] not in target_route_ids:
            continue

        trip_id = row["trip_id"]
        shape_id = row.get("shape_id", "")
        direction_id = row.get("direction_id", "0")
        trips[trip_id] = {"shapeId": shape_id, "directionId": direction_id}

        if shape_id:
            trips_by_shape.setdefault(shape_id, []).append(trip_id)

    if not trips:
        raise RuntimeError(f"No trips found for route IDs: {sorted(target_route_ids)}")

    shape_points = {shape_id: [] for shape_id in trips_by_shape}
    for row in read_csv(GTFS_DIR / "shapes.txt"):
        shape_id = row["shape_id"]
        if shape_id not in shape_points:
            continue

        shape_points[shape_id].append(
            {
                "seq": int(row["shape_pt_sequence"]),
                "lat": float(row["shape_pt_lat"]),
                "lon": float(row["shape_pt_lon"]),
            }
        )

    shapes_by_direction = {"0": [], "1": []}
    for shape_id, points in shape_points.items():
        points.sort(key=lambda point: point["seq"])
        coords = [[point["lat"], point["lon"]] for point in points]
        sample_trip_id = trips_by_shape[shape_id][0]
        direction_id = trips[sample_trip_id]["directionId"]

        if len(coords) > len(shapes_by_direction.get(direction_id, [])):
            shapes_by_direction[direction_id] = coords

    used_stop_ids = set()
    stop_sequences = {}

    for row in read_csv(GTFS_DIR / "stop_times.txt"):
        trip_id = row["trip_id"]
        if trip_id not in trips:
            continue

        stop_id = row["stop_id"]
        sequence = int(row["stop_sequence"])
        used_stop_ids.add(stop_id)
        stop_sequences[stop_id] = min(sequence, stop_sequences.get(stop_id, sequence))

    line_stops = []
    for stop_id in used_stop_ids:
        stop = stops.get(stop_id)
        if not stop:
            continue
        line_stops.append({**stop, "sequence": stop_sequences.get(stop_id, 999)})

    line_stops.sort(key=lambda stop: (stop["sequence"], stop["stopName"], stop["stopId"]))

    output = {
        "route": route,
        "stops": line_stops,
        "shapes": shapes_by_direction,
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"✅ Generated {OUTPUT_FILE}")
    print(f"   - route: {route['routeShortName']} ({route_id})")
    print(f"   - stops: {len(line_stops)}")
    print(f"   - direction 0 shape points: {len(shapes_by_direction['0'])}")
    print(f"   - direction 1 shape points: {len(shapes_by_direction['1'])}")


if __name__ == "__main__":
    main()
