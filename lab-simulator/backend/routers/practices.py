from fastapi import APIRouter, HTTPException
import data.practices  # noqa: F401 — triggers registration

from data.registry import get_all_practices, get_practice
from data.catalog import INSTRUMENTS, REAGENTS, SAMPLES, DISTRACTORS

router = APIRouter(prefix="/practices", tags=["practices"])


@router.get("")
async def list_practices():
    practices = get_all_practices()
    return [
        {
            "id": p["id"],
            "number": p["number"],
            "name": p["name"],
            "fullName": p["fullName"],
            "description": p["description"],
            "category": p["category"],
            "difficulty": p["difficulty"],
            "implemented": p.get("implemented", False),
            "comingSoon": p.get("comingSoon", True),
        }
        for p in sorted(practices, key=lambda x: x["number"])
    ]


@router.get("/{practice_id}")
async def get_practice_detail(practice_id: int):
    practice = get_practice(practice_id)
    if practice is None:
        raise HTTPException(status_code=404, detail="Práctica no encontrada")
    return practice


@router.get("/{practice_id}/materials")
async def get_practice_materials(practice_id: int):
    practice = get_practice(practice_id)
    if practice is None:
        raise HTTPException(status_code=404, detail="Práctica no encontrada")
    if not practice.get("implemented"):
        raise HTTPException(status_code=400, detail="Práctica no implementada aún")

    all_instruments = {**INSTRUMENTS, **DISTRACTORS}

    # Build full instrument details
    correct_instruments = []
    for iid in practice.get("requiredInstruments", []):
        inst = all_instruments.get(iid)
        if inst:
            correct_instruments.append({"id": iid, **inst})

    distractor_instruments = []
    for iid in practice.get("distractorInstruments", []):
        inst = all_instruments.get(iid)
        if inst:
            distractor_instruments.append({"id": iid, **inst})

    # Build full reagent details
    correct_reagents = []
    for rid in practice.get("requiredReagents", []):
        reagent = REAGENTS.get(rid)
        if reagent:
            correct_reagents.append({"id": rid, **reagent})

    distractor_reagents = []
    for rid in practice.get("distractorReagents", []):
        reagent = REAGENTS.get(rid)
        if reagent:
            distractor_reagents.append({"id": rid, **reagent})

    # Sample
    sample_id = practice.get("requiredSample")
    sample = None
    if sample_id:
        s = SAMPLES.get(sample_id)
        if s:
            sample = {"id": sample_id, **s}

    return {
        "instruments": correct_instruments,
        "reagents": correct_reagents,
        "sample": sample,
        "distractorInstruments": distractor_instruments,
        "distractorReagents": distractor_reagents,
    }
