from data.registry import get_practice


def calculate_expected_volume(practice_config, measured_value, sample_id=None):
    """Calculate expected titrant volume based on practice config."""
    titration = practice_config["titration"]
    prop = titration["proportionality"]

    if sample_id and "volumesBySample" in titration:
        base_volume = titration["volumesBySample"][sample_id]
    else:
        base_volume = titration["expectedVolume"]

    if prop == "fixed":
        return base_volume
    elif prop == "direct":
        ref = titration["referenceValue"]
        return base_volume * (measured_value / ref)
    elif prop == "inverse":
        ref = titration["referenceValue"]
        return base_volume * (ref / measured_value)
    return base_volume


def validate_student_calculation(practice_id, recorded_volume, measured_value, student_result):
    """Validate student's calculation against the correct result using THEIR recorded volume."""
    practice = get_practice(practice_id)
    if practice is None:
        raise ValueError(f"Practice {practice_id} not found")

    calc = practice["calculation"]
    tolerance = calc["tolerance"]

    # Calculate correct result based on student's actual recorded volume
    if practice_id == 5:
        M_EDTA = 0.01
        PM_CaCO3 = 100.09
        correct = (recorded_volume * M_EDTA * PM_CaCO3 * 1000) / measured_value
    else:
        correct = 0.0

    if correct == 0:
        percent_error = 0.0
    else:
        percent_error = abs(student_result - correct) / correct * 100

    is_within = percent_error <= tolerance

    if is_within:
        feedback = f"Correcto. Tu resultado ({student_result:.2f}) está dentro del {tolerance}% de tolerancia. Error: {percent_error:.2f}%."
    else:
        feedback = f"Tu resultado ({student_result:.2f}) difiere del valor esperado ({correct:.2f}) con un error de {percent_error:.2f}%."

    return {
        "correct_result": round(correct, 2),
        "student_result": round(student_result, 2),
        "percent_error": round(percent_error, 2),
        "is_within_tolerance": is_within,
        "tolerance": tolerance,
        "feedback": feedback,
    }
