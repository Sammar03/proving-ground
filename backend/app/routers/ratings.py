from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Response
from ..schemas import RatingIn, ResponseOut

router = APIRouter()


@router.put("/responses/{response_id}/rating", response_model=ResponseOut)
def rate(response_id: int, body: RatingIn, db: Session = Depends(get_db)):
    if body.rating not in (0, 0.5, 1):
        raise HTTPException(400, "rating must be 1 (win), 0.5 (draw), or 0 (loss)")
    resp = db.get(Response, response_id)
    if not resp:
        raise HTTPException(404, "response not found")
    if resp.rating is not None:
        raise HTTPException(409, "already judged")  # verdicts are write-once
    resp.rating = body.rating
    resp.note = body.note
    db.commit()
    db.refresh(resp)
    return resp
