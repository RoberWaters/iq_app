from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.section import Section
from schemas.teacher import SectionCreate, SectionUpdate, SectionResponse

router = APIRouter(prefix="/teacher", tags=["teacher"])


@router.get("/sections", response_model=List[SectionResponse])
async def list_sections(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Section).order_by(Section.code))
    return result.scalars().all()


@router.post("/sections", response_model=SectionResponse, status_code=201)
async def create_section(payload: SectionCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(
        select(Section).where(Section.code == payload.code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Ya existe una sección con ese código")

    section = Section(**payload.model_dump())
    db.add(section)
    await db.flush()
    await db.refresh(section)
    return section


@router.get("/sections/{section_id}", response_model=SectionResponse)
async def get_section(section_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Section).where(Section.id == section_id))
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=404, detail="Sección no encontrada")
    return section


@router.put("/sections/{section_id}", response_model=SectionResponse)
async def update_section(
    section_id: str,
    payload: SectionUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Section).where(Section.id == section_id))
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=404, detail="Sección no encontrada")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(section, field, value)

    await db.flush()
    await db.refresh(section)
    return section


@router.delete("/sections/{section_id}", status_code=204)
async def delete_section(section_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Section).where(Section.id == section_id))
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=404, detail="Sección no encontrada")

    await db.delete(section)
    await db.flush()
