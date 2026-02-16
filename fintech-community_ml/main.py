from fastapi import FastAPI, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import pandas as pd
import numpy as np

app = FastAPI()

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load clustered dataset once when server starts
df_compare = pd.read_csv("ml/clustered_users.csv")


@app.get("/")
def home():
    return {"message": "Backend is running"}

@app.get("/test")
def test():
    """Test endpoint to verify backend is accessible"""
    return {
        "status": "ok",
        "message": "ML backend is running",
        "dataset_loaded": len(df_compare) > 0,
        "dataset_size": len(df_compare)
    }

@app.get("/compare/{user_id}")
def compare_user(user_id: str):
    """
    Compare user by client_id (from ML dataset)
    """
    # Find user in dataset
    user = df_compare[df_compare["client_id"] == user_id]

    # If user not found
    if user.empty:
        return {"error": "User not found"}

    # Extract first matching row
    user = user.iloc[0]

    cluster_id = user["cluster"]

    # Get cluster averages
    cluster_data = df_compare[df_compare["cluster"] == cluster_id]
    cluster_avg = cluster_data.mean(numeric_only=True)

    comparison = {}

    numeric_cols = [
        "spending_ratio",
        "debt_ratio",
        "credit_score",
        "transaction_count",
        "avg_transaction"
    ]

    for col in numeric_cols:
        user_value = user[col]
        cluster_value = cluster_avg[col]

        diff_percent = ((user_value - cluster_value) / cluster_value) * 100

        if diff_percent > 10:
            status = "Above Peer Average"
        elif diff_percent < -10:
            status = "Below Peer Average"
        else:
            status = "Near Peer Average"

        comparison[col] = {
            "user_value": round(float(user_value), 2),
            "cluster_average": round(float(cluster_value), 2),
            "difference_percent": round(float(diff_percent), 2),
            "performance_status": status
        }

    percentiles = {}

    for col in numeric_cols:
        percentile = (
            cluster_data[col]
            .rank(pct=True)
            .loc[user.name] * 100
        )
        percentiles[col] = round(float(percentile), 2)

    return {
        "client_id": user_id,
        "cluster": int(cluster_id),
        "comparison": comparison,
        "peer_count": len(cluster_data),
        "percentile_rankings": percentiles
    }


@app.post("/compare-by-profile")
def compare_by_profile(
    yearly_income: Optional[float] = Form(None),
    monthly_income: Optional[float] = Form(None),
    total_expense: Optional[float] = Form(None),
    monthly_expense: Optional[float] = Form(None),
    total_debt: Optional[float] = Form(None),
    credit_score: Optional[float] = Form(None),
    transaction_count: Optional[int] = Form(None),
    avg_transaction: Optional[float] = Form(None)
):
    """
    Compare user by financial profile (from backend database).
    Finds the closest matching client_id in the ML dataset.
    """
    try:
        # Convert monthly to yearly if needed
        if monthly_income and (yearly_income is None or yearly_income == 0):
            yearly_income = monthly_income * 12
        if monthly_expense and (total_expense is None or total_expense == 0):
            total_expense = monthly_expense * 12
        
        # Calculate spending_ratio and debt_ratio
        if yearly_income and yearly_income > 0:
            if total_expense and total_expense > 0:
                spending_ratio = total_expense / yearly_income
            else:
                spending_ratio = float(df_compare["spending_ratio"].median())
            
            if total_debt and total_debt > 0:
                debt_ratio = total_debt / yearly_income
            else:
                debt_ratio = float(df_compare["debt_ratio"].median())
        else:
            # Use median values if no income data
            spending_ratio = float(df_compare["spending_ratio"].median())
            debt_ratio = float(df_compare["debt_ratio"].median())
        
        # Use defaults if not provided
        if credit_score is None or credit_score == 0:
            credit_score = float(df_compare["credit_score"].median())
        if transaction_count is None or transaction_count == 0:
            transaction_count = int(df_compare["transaction_count"].median())
        if avg_transaction is None or avg_transaction == 0:
            avg_transaction = float(df_compare["avg_transaction"].median())
        
        # Find closest matching user in dataset using Euclidean distance
        # Normalize features for comparison
        features_to_match = {
            "spending_ratio": spending_ratio,
            "debt_ratio": debt_ratio,
            "credit_score": credit_score,
            "transaction_count": transaction_count,
            "avg_transaction": avg_transaction
        }
        
        # Calculate distances
        distances = []
        for idx, row in df_compare.iterrows():
            distance = 0
            for col, value in features_to_match.items():
                # Normalize by dividing by max value in column for fair comparison
                col_max = df_compare[col].max()
                col_min = df_compare[col].min()
                if col_max > col_min:
                    normalized_user_val = (value - col_min) / (col_max - col_min)
                    normalized_row_val = (row[col] - col_min) / (col_max - col_min)
                    distance += (normalized_user_val - normalized_row_val) ** 2
            distances.append((distance, idx))
        
        # Find closest match
        distances.sort(key=lambda x: x[0])
        closest_idx = distances[0][1]
        matched_user = df_compare.loc[closest_idx]
        
        cluster_id = matched_user["cluster"]
        cluster_data = df_compare[df_compare["cluster"] == cluster_id]
        cluster_avg = cluster_data.mean(numeric_only=True)
        
        # Create comparison using the matched user's cluster
        comparison = {}
        numeric_cols = [
            "spending_ratio",
            "debt_ratio",
            "credit_score",
            "transaction_count",
            "avg_transaction"
        ]
        
        for col in numeric_cols:
            user_value = features_to_match[col]
            cluster_value = cluster_avg[col]
            
            diff_percent = ((user_value - cluster_value) / cluster_value) * 100 if cluster_value != 0 else 0
            
            if diff_percent > 10:
                status = "Above Peer Average"
            elif diff_percent < -10:
                status = "Below Peer Average"
            else:
                status = "Near Peer Average"
            
            comparison[col] = {
                "user_value": round(float(user_value), 2),
                "cluster_average": round(float(cluster_value), 2),
                "difference_percent": round(float(diff_percent), 2),
                "performance_status": status
            }
        
        # Calculate percentiles within cluster
        percentiles = {}
        for col in numeric_cols:
            user_value = features_to_match[col]
            # Calculate percentile: how many users in cluster have lower value
            lower_count = (cluster_data[col] < user_value).sum()
            percentile = (lower_count / len(cluster_data)) * 100
            percentiles[col] = round(float(percentile), 2)

        return {
            "matched_client_id": str(matched_user["client_id"]),
            "cluster": int(cluster_id),
            "persona": matched_user.get("persona", f"Cluster {cluster_id}"),
            "comparison": comparison,
            "peer_count": len(cluster_data),
            "percentile_rankings": percentiles
        }
    except Exception as e:
        import traceback
        error_msg = f"Error in compare_by_profile: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        return {"error": f"Failed to process comparison: {str(e)}"}

# -------------------------------
# COMMUNITY TAB
# -------------------------------

@app.get("/community")
def community_overview():

    total_users = len(df_compare)

    cluster_sizes = df_compare["cluster"].value_counts().to_dict()

    avg_credit_score = round(df_compare["credit_score"].mean(), 2)
    avg_debt_ratio = round(df_compare["debt_ratio"].mean(), 2)

    best_cluster = df_compare.groupby("cluster")["credit_score"].mean().idxmax()

    return {
        "total_users": total_users,
        "cluster_distribution": cluster_sizes,
        "average_credit_score": avg_credit_score,
        "average_debt_ratio": avg_debt_ratio,
        "top_performing_cluster_by_credit_score": int(best_cluster)
    }