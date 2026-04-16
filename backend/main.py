from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from database import engine, Base
from routers import datasets, analysis, ml, insights, chat

# Create DB tables
Base.metadata.create_all(bind=engine)

# Create upload dir
os.makedirs("uploads", exist_ok=True)

app = FastAPI(
    title="AutoAnalyst AI",
    description="Autonomous Data Scientist Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(datasets.router, prefix="/api/datasets", tags=["Datasets"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(ml.router, prefix="/api/ml", tags=["Machine Learning"])
app.include_router(insights.router, prefix="/api/insights", tags=["AI Insights"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])

@app.get("/")
def root():
    return {"message": "AutoAnalyst AI is running", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "healthy"}
