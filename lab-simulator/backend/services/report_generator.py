from datetime import datetime


def generate_report(session, practice_config):
    """Generate evaluation report based on session data and practice evaluation criteria."""
    evaluation = practice_config.get("evaluation", {})
    criteria_config = evaluation.get("criteria", [])
    criteria_scores = []
    total_score = 0.0

    for criterion in criteria_config:
        cid = criterion["id"]
        weight = criterion["weight"]
        ctype = criterion["type"]
        score = 0.0
        feedback = ""

        if ctype == "boolean":
            if cid == "materials":
                if session.materials_correct:
                    score = weight
                    feedback = "Selección correcta de materiales."
                else:
                    score = 0
                    feedback = "Materiales seleccionados incorrectamente."
            elif cid == "measurement":
                if session.measured_value is not None:
                    score = weight
                    feedback = "Medición registrada correctamente."
                else:
                    score = 0
                    feedback = "No se registró la medición."
            elif cid == "assembly":
                if session.assembly_correct:
                    score = weight
                    feedback = "Montaje completado correctamente."
                else:
                    score = 0
                    feedback = "Montaje incompleto o incorrecto."
            elif cid == "interpretation":
                if session.student_calculation is not None:
                    score = weight
                    feedback = "Interpretación realizada."
                else:
                    score = 0
                    feedback = "No se realizó interpretación."

        elif ctype == "range":
            scoring_tiers = criterion.get("scoring", [])
            if cid == "endpoint":
                if session.expected_volume and session.recorded_volume:
                    error = abs(session.recorded_volume - session.expected_volume)
                    for tier in scoring_tiers:
                        if error <= tier["maxError"]:
                            score = tier["score"]
                            feedback = tier["feedback"]
                            break
                else:
                    score = 0
                    feedback = "No se registró lectura de titulación."

            elif cid == "calculation":
                if session.percent_error is not None:
                    for tier in scoring_tiers:
                        if session.percent_error <= tier["maxError"]:
                            score = tier["score"]
                            feedback = tier["feedback"]
                            break
                else:
                    score = 0
                    feedback = "No se realizó el cálculo."

        criteria_scores.append({
            "criterion_id": cid,
            "criterion_label": criterion["label"],
            "score": score,
            "max_score": weight,
            "feedback": feedback,
        })
        total_score += score

    max_score = evaluation.get("maxScore", 100)
    passing_score = evaluation.get("passingScore", 60)
    passed = total_score >= passing_score

    if total_score >= 80:
        overall = "Excelente desempeño en la práctica."
    elif total_score >= 60:
        overall = "Buen desempeño. Revisa los puntos de mejora."
    else:
        overall = "Desempeño insuficiente. Se recomienda repetir la práctica."

    return {
        "session_id": session.id,
        "practice_id": session.practice_id,
        "criteria": criteria_scores,
        "total_score": round(total_score, 2),
        "max_score": max_score,
        "passed": passed,
        "overall_feedback": overall,
        "completed_at": datetime.utcnow().isoformat(),
    }
