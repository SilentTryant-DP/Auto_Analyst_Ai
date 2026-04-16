from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
import pandas as pd
import os
import uuid
import json
from database import get_db, Dataset

router = APIRouter()
UPLOAD_DIR = "uploads"


def read_dataset(file_path: str) -> pd.DataFrame:
    if file_path.endswith(".csv"):
        return pd.read_csv(file_path)
    elif file_path.endswith((".xlsx", ".xls")):
        return pd.read_excel(file_path)
    else:
        raise ValueError("Unsupported file format")


@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Validate file type
    if not file.filename.endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")

    # Save file
    unique_name = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Read dataset info
    try:
        df = read_dataset(file_path)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    dtypes = {col: str(dtype) for col, dtype in df.dtypes.items()}

    dataset = Dataset(
        filename=unique_name,
        original_name=file.filename,
        file_path=file_path,
        file_size=len(content),
        rows=len(df),
        columns=len(df.columns),
        column_names=list(df.columns),
        dtypes=dtypes,
        status="ready"
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    return {
        "id": dataset.id,
        "filename": dataset.original_name,
        "rows": dataset.rows,
        "columns": dataset.columns,
        "column_names": dataset.column_names,
        "dtypes": dataset.dtypes,
        "file_size": dataset.file_size,
        "uploaded_at": dataset.uploaded_at
    }


@router.get("/")
def list_datasets(db: Session = Depends(get_db)):
    datasets = db.query(Dataset).order_by(Dataset.uploaded_at.desc()).all()
    return [
        {
            "id": d.id,
            "filename": d.original_name,
            "rows": d.rows,
            "columns": d.columns,
            "file_size": d.file_size,
            "uploaded_at": d.uploaded_at,
            "status": d.status
        }
        for d in datasets
    ]


@router.get("/{dataset_id}")
def get_dataset(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return {
        "id": dataset.id,
        "filename": dataset.original_name,
        "rows": dataset.rows,
        "columns": dataset.columns,
        "column_names": dataset.column_names,
        "dtypes": dataset.dtypes,
        "file_size": dataset.file_size,
        "uploaded_at": dataset.uploaded_at,
        "status": dataset.status
    }


@router.get("/{dataset_id}/preview")
def preview_dataset(dataset_id: int, rows: int = 10, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = read_dataset(dataset.file_path)
    preview = df.head(rows)

    # Replace NaN with None for JSON serialization
    preview = preview.where(pd.notnull(preview), None)

    return {
        "columns": list(df.columns),
        "data": preview.to_dict(orient="records"),
        "total_rows": len(df)
    }


@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    if os.path.exists(dataset.file_path):
        os.remove(dataset.file_path)

    db.delete(dataset)
    db.commit()
    return {"message": "Dataset deleted successfully"}
