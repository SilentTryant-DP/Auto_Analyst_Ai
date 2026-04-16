import pandas as pd
import numpy as np
import json
import warnings
import xgboost as xgb
from sqlalchemy.orm import Session
from database import SessionLocal, Dataset, AnalysisResult, MLResult
from celery_app import celery

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.ensemble import (
    RandomForestClassifier, RandomForestRegressor,
    GradientBoostingClassifier, GradientBoostingRegressor
)
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    mean_squared_error, mean_absolute_error, r2_score
)

warnings.filterwarnings("ignore")


def read_dataset(file_path: str) -> pd.DataFrame:
    if file_path.endswith(".csv"):
        return pd.read_csv(file_path)
    elif file_path.endswith((".xlsx", ".xls")):
        return pd.read_excel(file_path)
    raise ValueError("Unsupported file format")


def safe_json(obj):
    if isinstance(obj, dict):
        return {k: safe_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [safe_json(v) for v in obj]
    elif isinstance(obj, (np.integer,)):
        return int(obj)
    elif isinstance(obj, (np.floating,)):
        return None if np.isnan(obj) else float(obj)
    elif isinstance(obj, (np.ndarray,)):
        return obj.tolist()
    elif isinstance(obj, float) and np.isnan(obj):
        return None
    return obj


@celery.task(name="tasks.run_eda", bind=True)
def run_eda_task(self, dataset_id: int):
    db: Session = SessionLocal()
    try:
        dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if not dataset:
            return {"error": "Dataset not found"}

        df = read_dataset(dataset.file_path)

        # Update status
        dataset.status = "analyzing"
        db.commit()

        summary = {}
        for col in df.columns:
            col_data = df[col]
            dtype = str(col_data.dtype)
            col_info = {"dtype": dtype, "count": int(col_data.count()), "nulls": int(col_data.isnull().sum())}

            if dtype in ["int64", "float64", "int32", "float32"]:
                col_info.update({
                    "mean": safe_json(col_data.mean()),
                    "median": safe_json(col_data.median()),
                    "std": safe_json(col_data.std()),
                    "min": safe_json(col_data.min()),
                    "max": safe_json(col_data.max()),
                    "q25": safe_json(col_data.quantile(0.25)),
                    "q75": safe_json(col_data.quantile(0.75)),
                })
            else:
                col_info.update({
                    "unique": int(col_data.nunique()),
                    "top": str(col_data.mode()[0]) if len(col_data.mode()) > 0 else None,
                    "top_freq": int(col_data.value_counts().iloc[0]) if len(col_data) > 0 else 0,
                })
            summary[col] = col_info

        missing = {col: int(df[col].isnull().sum()) for col in df.columns}
        missing_pct = {col: round(df[col].isnull().sum() / len(df) * 100, 2) for col in df.columns}

        numeric_df = df.select_dtypes(include=[np.number])
        correlations = {}
        if len(numeric_df.columns) > 1:
            corr_matrix = numeric_df.corr()
            correlations = safe_json(corr_matrix.to_dict())

        column_types = {}
        for col in df.columns:
            dtype = str(df[col].dtype)
            nunique = df[col].nunique()
            n = len(df)
            if dtype in ["int64", "float64", "int32", "float32"]:
                column_types[col] = "numerical"
            elif nunique <= min(20, n * 0.05):
                column_types[col] = "categorical"
            else:
                column_types[col] = "text"

        outliers = {}
        for col in numeric_df.columns:
            q1 = numeric_df[col].quantile(0.25)
            q3 = numeric_df[col].quantile(0.75)
            iqr = q3 - q1
            lower = q1 - 1.5 * iqr
            upper = q3 + 1.5 * iqr
            outlier_count = int(((numeric_df[col] < lower) | (numeric_df[col] > upper)).sum())
            outliers[col] = {
                "count": outlier_count,
                "pct": round(outlier_count / len(df) * 100, 2),
                "lower_bound": safe_json(lower),
                "upper_bound": safe_json(upper)
            }

        distributions = {}
        for col in numeric_df.columns:
            vals = numeric_df[col].dropna()
            if len(vals) > 0:
                hist, bin_edges = np.histogram(vals, bins=20)
                distributions[col] = {
                    "hist": hist.tolist(),
                    "bins": [round(float(e), 4) for e in bin_edges.tolist()]
                }
            else:
                distributions[col] = {"hist": [], "bins": []}

        result_data = {
            "summary_stats": summary,
            "missing_values": {"counts": missing, "percentages": missing_pct},
            "correlations": correlations,
            "column_types": column_types,
            "outliers": outliers,
            "distributions": distributions,
        }

        existing = db.query(AnalysisResult).filter(AnalysisResult.dataset_id == dataset_id).first()
        if existing:
            for key, val in result_data.items():
                setattr(existing, key, val)
        else:
            ar = AnalysisResult(
                dataset_id=dataset_id,
                **result_data
            )
            db.add(ar)
        
        dataset.status = "ready"
        db.commit()

        return {"dataset_id": dataset_id, "status": "completed"}

    except Exception as e:
        dataset.status = "error"
        db.commit()
        return {"error": str(e)}
    finally:
        db.close()


def detect_problem_type(series: pd.Series) -> str:
    if series.dtype == object or series.nunique() <= 20:
        return "classification"
    return "regression"


def preprocess(df: pd.DataFrame, target: str):
    df = df.copy().dropna(subset=[target])
    X = df.drop(columns=[target])
    y = df[target]

    le_map = {}
    for col in X.select_dtypes(include="object").columns:
        le = LabelEncoder()
        X[col] = le.fit_transform(X[col].astype(str))
        le_map[col] = le

    X = X.select_dtypes(include=[np.number])
    X = X.fillna(X.median())

    return X, y, le_map


def safe_float(val):
    try:
        v = float(val)
        return None if np.isnan(v) or np.isinf(v) else round(v, 4)
    except Exception:
        return None


@celery.task(name="tasks.train_models", bind=True)
def train_models_task(self, dataset_id: int, target_column: str, problem_type: str, test_size: float = 0.2):
    db: Session = SessionLocal()
    try:
        dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if not dataset:
            return {"error": "Dataset not found"}

        dataset.status = "training_ml"
        db.commit()

        df = read_dataset(dataset.file_path)
        if target_column not in df.columns:
            return {"error": f"Column '{target_column}' not found"}

        X, y, _ = preprocess(df, target_column)
        if len(X.columns) == 0:
            return {"error": "No numeric features found"}

        if problem_type == "auto":
            problem_type = detect_problem_type(y)

        le_target = None
        if problem_type == "classification" and (y.dtype == object or str(y.dtype) == "object"):
            le_target = LabelEncoder()
            y = pd.Series(le_target.fit_transform(y.astype(str)), index=y.index)

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)

        scaler = StandardScaler()
        X_train_sc = scaler.fit_transform(X_train)
        X_test_sc = scaler.transform(X_test)

        results = {}
        if problem_type == "classification":
            models = {
                "Logistic Regression": LogisticRegression(max_iter=500, random_state=42),
                "Decision Tree": DecisionTreeClassifier(random_state=42),
                "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42),
                "Gradient Boosting": GradientBoostingClassifier(random_state=42),
                "XGBoost": xgb.XGBClassifier(use_label_encoder=False, eval_metric="logloss", random_state=42),
            }
            for name, model in models.items():
                try:
                    Xtr = X_train_sc if name == "Logistic Regression" else X_train
                    Xte = X_test_sc if name == "Logistic Regression" else X_test
                    model.fit(Xtr, y_train)
                    preds = model.predict(Xte)
                    results[name] = {
                        "accuracy": safe_float(accuracy_score(y_test, preds)),
                        "precision": safe_float(precision_score(y_test, preds, average="weighted", zero_division=0)),
                        "recall": safe_float(recall_score(y_test, preds, average="weighted", zero_division=0)),
                        "f1": safe_float(f1_score(y_test, preds, average="weighted", zero_division=0)),
                    }
                except Exception as e:
                    results[name] = {"error": str(e)}

            valid_models = [k for k, v in results.items() if "error" not in v]
            if not valid_models:
                return {"error": "All classification models failed to train"}
            best_model_name = max(valid_models, key=lambda k: results[k].get("accuracy", 0))

        else:
            models = {
                "Linear Regression": LinearRegression(),
                "Decision Tree": DecisionTreeRegressor(random_state=42),
                "Random Forest": RandomForestRegressor(n_estimators=100, random_state=42),
                "Gradient Boosting": GradientBoostingRegressor(random_state=42),
                "XGBoost": xgb.XGBRegressor(random_state=42),
            }
            for name, model in models.items():
                try:
                    Xtr = X_train_sc if name == "Linear Regression" else X_train
                    Xte = X_test_sc if name == "Linear Regression" else X_test
                    model.fit(Xtr, y_train)
                    preds = model.predict(Xte)
                    rmse = safe_float(np.sqrt(mean_squared_error(y_test, preds)))
                    results[name] = {
                        "r2": safe_float(r2_score(y_test, preds)),
                        "rmse": rmse,
                        "mae": safe_float(mean_absolute_error(y_test, preds)),
                    }
                except Exception as e:
                    results[name] = {"error": str(e)}

            valid_models = [k for k, v in results.items() if "error" not in v]
            if not valid_models:
                return {"error": "All regression models failed to train"}
            best_model_name = max(valid_models, key=lambda k: results[k].get("r2", -999))

        best_metrics = results[best_model_name]
        
        feature_importance = {}
        try:
            best_m = models[best_model_name]
            if hasattr(best_m, "feature_importances_"):
                fi = best_m.feature_importances_
                feature_importance = dict(sorted(
                    {col: round(float(imp), 4) for col, imp in zip(X.columns, fi)}.items(),
                    key=lambda x: x[1], reverse=True
                ))
        except Exception:
            pass

        existing = db.query(MLResult).filter(MLResult.dataset_id == dataset_id).first()
        ml_data = {
            "dataset_id": dataset_id,
            "target_column": target_column,
            "problem_type": problem_type,
            "best_model": best_model_name,
            "metrics": best_metrics,
            "feature_importance": feature_importance,
            "all_models": results,
        }
        if existing:
            for k, v in ml_data.items():
                setattr(existing, k, v)
        else:
            db.add(MLResult(**ml_data))
        
        dataset.status = "ready"
        db.commit()

        return {"dataset_id": dataset_id, "status": "completed", "best_model": best_model_name}

    except Exception as e:
        dataset.status = "error"
        db.commit()
        return {"error": str(e)}
    finally:
        db.close()
