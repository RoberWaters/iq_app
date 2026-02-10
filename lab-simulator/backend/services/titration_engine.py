from data.registry import get_practice
from services.calculation_engine import calculate_expected_volume


def get_expected_volume(practice_id, measured_value, sample_id=None):
    """Return expected volume and explanation for a practice."""
    practice = get_practice(practice_id)
    if practice is None:
        raise ValueError(f"Practice {practice_id} not found")

    titration = practice.get("titration")
    if titration is None:
        raise ValueError(f"Practice {practice_id} has no titration config")

    volume = calculate_expected_volume(practice, measured_value, sample_id)

    explanation = (
        f"Para {practice['name']}: gasto esperado = {volume:.2f} mL de "
        f"{titration['titrant']} ({titration['titrantConcentration']} {titration['titrantConcentrationUnit']})"
    )

    return {
        "expected_volume": round(volume, 4),
        "explanation": explanation,
    }


def get_color_at_progress(practice_id, progress):
    """Interpolate color for a given titration progress."""
    practice = get_practice(practice_id)
    if practice is None:
        return "#F0F0F0"

    transitions = practice.get("titration", {}).get("colorTransitions", [])
    if not transitions:
        return "#F0F0F0"

    if progress <= transitions[0]["progress"]:
        return transitions[0]["color"]
    if progress >= transitions[-1]["progress"]:
        return transitions[-1]["color"]

    for i in range(len(transitions) - 1):
        curr = transitions[i]
        nxt = transitions[i + 1]
        if curr["progress"] <= progress <= nxt["progress"]:
            t = (progress - curr["progress"]) / (nxt["progress"] - curr["progress"])
            # Simple RGB interpolation
            c1 = _hex_to_rgb(curr["color"])
            c2 = _hex_to_rgb(nxt["color"])
            r = int(c1[0] + (c2[0] - c1[0]) * t)
            g = int(c1[1] + (c2[1] - c1[1]) * t)
            b = int(c1[2] + (c2[2] - c1[2]) * t)
            return f"#{r:02x}{g:02x}{b:02x}"

    return transitions[-1]["color"]


def _hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
