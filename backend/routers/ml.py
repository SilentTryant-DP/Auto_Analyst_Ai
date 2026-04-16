from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db, Dataset, MLResult
from tasks import train_models_task

router = APIRouter()

class TrainRequest(BaseModel):
    target_column: str
    problem_type: Optional[str] = "auto"  # auto / classification / regression
    test_size: Optional[float] = 0.2

@router.post("/{dataset_id}/train")
def start_ml_train_task(dataset_id: int, req: TrainRequest, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Start Celery task
    task = train_models_task.delay(
        dataset_id,
        req.target_column,
        req.problem_type,
        req.test_size
    )

    dataset.status = "queued_ml"
    db.commit()

    return {"message": "ML training task started in background", "task_id": task.id, "dataset_id": dataset_id}


@router.get("/{dataset_id}/results")
def get_ml_results(dataset_id: int, db: Session = Depends(get_db)):
    result = db.query(MLResult).filter(MLResult.dataset_id == dataset_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="No ML results found. Train a model first.")
    return {
        "problem_type": result.problem_type,
        "target_column": result.target_column,
        "best_model": result.best_model,
        "metrics": result.metrics,
        "feature_importance": result.feature_importance,
        "all_models": result.all_models,
        "created_at": result.created_at
    }
