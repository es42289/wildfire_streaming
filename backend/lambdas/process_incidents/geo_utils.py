"""Pure-Python geo utilities: Haversine distance and convex hull."""

import math


def haversine_km(lat1, lon1, lat2, lon2):
    """Great-circle distance between two points in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _cross(o, a, b):
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])


def convex_hull(points):
    """Andrew's monotone chain convex hull. Input: list of (lon, lat) tuples.
    Returns list of (lon, lat) forming a closed polygon (first == last)."""
    pts = sorted(set(points))
    if len(pts) <= 1:
        return pts
    if len(pts) == 2:
        return pts + [pts[0]]

    lower = []
    for p in pts:
        while len(lower) >= 2 and _cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)

    upper = []
    for p in reversed(pts):
        while len(upper) >= 2 and _cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)

    hull = lower[:-1] + upper  # upper already closes back to start
    return hull


def centroid(points):
    """Centroid of a list of (lon, lat) tuples."""
    if not points:
        return (0.0, 0.0)
    lons = [p[0] for p in points]
    lats = [p[1] for p in points]
    return (sum(lons) / len(lons), sum(lats) / len(lats))


def buffered_point(lon, lat, radius_km=2.0, segments=16):
    """Create a circle polygon around a point (for single-hotspot incidents)."""
    coords = []
    for i in range(segments + 1):
        angle = 2 * math.pi * i / segments
        dlat = radius_km / 111.32
        dlon = radius_km / (111.32 * math.cos(math.radians(lat)))
        coords.append((lon + dlon * math.cos(angle), lat + dlat * math.sin(angle)))
    return coords
