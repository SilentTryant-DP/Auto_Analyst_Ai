from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import httpx
import json
import pandas as pd
import numpy as np
from database import get_db, Dataset, AnalysisResult, MLResult

import os

router = APIRouter()
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
MODEL = os.getenv("OLLAMA_MODEL", "llama3")


def read_dataset(file_path: str) -> pd.DataFrame:
    if file_path.endswith(".csv"):
        return pd.read_csv(file_path)
    return pd.read_excel(file_path)


def call_llama(prompt: str, timeout: int = 120) -> str:
    try:
        response = httpx.post(
            OLLAMA_URL,
            json={"model": MODEL, "prompt": prompt, "stream": False},
            timeout=timeout
        )
        if response.status_code == 200:
            return response.json().get("response", "No response from AI.")
        return f"AI service returned status {response.status_code}"
    except httpx.ConnectError:
        return (
            "⚠️ Ollama is not running. Please start it with: `ollama serve` "
            "and pull the model with: `ollama pull llama3`"
        )
    except Exception as e:
        return f"AI service error: {str(e)}"


def build_dataset_context(dataset, analysis=None, ml_result=None) -> str:
    ctx = f"""Dataset: {dataset.original_name}
Shape: {dataset.rows} rows × {dataset.columns} columns
Columns: {', '.join(dataset.column_names or [])}
"""
    if analysis:
        missing = analysis.missing_values or {}
        counts = missing.get("counts", {})
        high_missing = [col for col, cnt in counts.items() if cnt > 0]
        if high_missing:
            ctx += f"Missing values in: {', '.join(high_missing)}\n"

        outliers = analysis.outliers or {}
        high_outliers = [col for col, info in outliers.items() if info.get("pct", 0) > 5]
        if high_outliers:
            ctx += f"Columns with outliers (>5%): {', '.join(high_outliers)}\n"

    if ml_result:
        ctx += f"""
ML Results:
- Problem Type: {ml_result.problem_type}
- Target: {ml_result.target_column}
- Best Model: {ml_result.best_model}
- Metrics: {json.dumps(ml_result.metrics)}
- Top Features: {list(ml_result.feature_importance.keys())[:5] if ml_result.feature_importance else 'N/A'}
"""
    return ctx


@router.get("/{dataset_id}/auto")
def generate_auto_insights(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    analysis = db.query(AnalysisResult).filter(AnalysisResult.dataset_id == dataset_id).first()
    ml_result = db.query(MLResult).filter(MLResult.dataset_id == dataset_id).first()

    ctx = build_dataset_context(dataset, analysis, ml_result)

    prompt = f"""You are an expert data scientist analyzing a dataset. Based on the following information, provide clear, actionable insights.

{ctx}

Please provide:
1. A brief summary of this dataset (2-3 sentences)
2. Key observations about data quality (missing values, outliers)
3. Most interesting patterns or relationships you notice
4. Recommendations for further analysis or data cleaning
5. Business insights or actionable recommendations

Be concise, specific, and use plain language that non-technical users can understand. Use bullet points where appropriate."""

    insight_text = call_llama(prompt)
    return {"insights": insight_text, "dataset_name": dataset.original_name}


@router.get("/{dataset_id}/ml-explanation")
def explain_ml_results(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    ml_result = db.query(MLResult).filter(MLResult.dataset_id == dataset_id).first()
    if not ml_result:
        raise HTTPException(status_code=404, detail="No ML results found. Run ML training first.")

    ctx = build_dataset_context(dataset, ml_result=ml_result)

    prompt = f"""You are an expert data scientist. Explain the following machine learning results in simple, non-technical language.

{ctx}
All model results: {json.dumps(ml_result.all_models)}

Please explain:
1. What the model is trying to predict and why it matters
2. How well the best model performed and what the metrics mean in plain English
3. Which features are most important and why they might matter
4. Why the best model outperformed others (briefly)
5. Practical recommendations based on these results

Use simple language, avoid jargon, and make it understandable for business users."""

    explanation = call_llama(prompt)
    return {"explanation": explanation, "model": ml_result.best_model, "metrics": ml_result.metrics}
