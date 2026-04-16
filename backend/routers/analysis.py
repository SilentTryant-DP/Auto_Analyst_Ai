from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import pandas as pd
import numpy as np
import json
from database import get_db, Dataset, AnalysisResult

router = APIRouter()


from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db, Dataset, AnalysisResult
from tasks import run_eda_task

router = APIRouter()

@router.post("/{dataset_id}/analyze")
def start_eda_task(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Dispatch Celery Task
    task = run_eda_task.delay(dataset_id)
    
    # Update status immediately
    dataset.status = "queued_analysis"
    db.commit()

    return {"message": "EDA task started in background", "task_id": task.id, "dataset_id": dataset_id}


@router.get("/{dataset_id}")
def get_eda_results(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    existing = db.query(AnalysisResult).filter(AnalysisResult.dataset_id == dataset_id).first()
    if not existing:
        return {"status": dataset.status, "message": "Analysis not ready or not started"}

    return {
        "status": dataset.status,
        "summary_stats": existing.summary_stats,
        "missing_values": existing.missing_values,
        "correlations": existing.correlations,
        "column_types": existing.column_types,
        "outliers": existing.outliers,
        "distributions": existing.distributions,
    }
