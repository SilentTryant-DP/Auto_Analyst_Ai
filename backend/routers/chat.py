from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
import httpx
import json
import pandas as pd
from database import get_db, Dataset, AnalysisResult, MLResult, ChatHistory

import os

router = APIRouter()
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
MODEL = os.getenv("OLLAMA_MODEL", "llama3")


class ChatRequest(BaseModel):
    message: str
    dataset_id: int


def call_llama(prompt: str) -> str:
    try:
        response = httpx.post(
            OLLAMA_URL,
            json={"model": MODEL, "prompt": prompt, "stream": False},
            timeout=120
        )
        if response.status_code == 200:
            return response.json().get("response", "No response.")
        return f"AI service error: status {response.status_code}"
    except httpx.ConnectError:
        return "Ollama is not running. Start it with: ollama serve then ollama pull llama3"
    except Exception as e:
        return f"AI error: {str(e)}"


@router.post("/")
def chat(req: ChatRequest, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    analysis = db.query(AnalysisResult).filter(AnalysisResult.dataset_id == req.dataset_id).first()
    ml_result = db.query(MLResult).filter(MLResult.dataset_id == req.dataset_id).first()

    context = f"Dataset: {dataset.original_name}\nRows: {dataset.rows}, Columns: {dataset.columns}\n"
    context += f"Columns: {', '.join(dataset.column_names or [])}\n"

    if analysis:
        context += f"Missing values: {json.dumps(analysis.missing_values or {})}\n"
        context += f"Column types: {json.dumps(analysis.column_types or {})}\n"

    if ml_result:
        context += f"ML: {ml_result.problem_type} | Best model: {ml_result.best_model} | Metrics: {json.dumps(ml_result.metrics)}\n"

    history = db.query(ChatHistory).filter(
        ChatHistory.dataset_id == req.dataset_id
    ).order_by(ChatHistory.created_at.desc()).limit(12).all()
    history = list(reversed(history))

    history_text = ""
    for h in history:
        role = "User" if h.role == "user" else "Assistant"
        history_text += f"{role}: {h.message}\n"

    prompt = (
        "You are AutoAnalyst AI, an expert data scientist assistant.\n\n"
        f"Dataset Context:\n{context}\n"
        f"Conversation History:\n{history_text}\n"
        f"User: {req.message}\n\n"
        "Respond as a knowledgeable but friendly data scientist. Be concise and helpful.\n"
        "Assistant:"
    )

    reply = call_llama(prompt)

    # Save to history
    db.add(ChatHistory(dataset_id=req.dataset_id, role="user", message=req.message))
    db.add(ChatHistory(dataset_id=req.dataset_id, role="assistant", message=reply))
    db.commit()

    return {"reply": reply, "dataset_id": req.dataset_id}


@router.get("/{dataset_id}/history")
def get_history(dataset_id: int, db: Session = Depends(get_db)):
    history = db.query(ChatHistory).filter(
        ChatHistory.dataset_id == dataset_id
    ).order_by(ChatHistory.created_at.asc()).all()
    return [{"role": h.role, "message": h.message, "created_at": h.created_at} for h in history]


@router.delete("/{dataset_id}/history")
def clear_history(dataset_id: int, db: Session = Depends(get_db)):
    db.query(ChatHistory).filter(ChatHistory.dataset_id == dataset_id).delete()
    db.commit()
    return {"message": "Chat history cleared"}
