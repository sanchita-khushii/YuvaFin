from fastapi import FastAPI
import pandas as pd
import numpy as np

app = FastAPI()

# Load clustered dataset once when server starts
df_compare = pd.read_csv("ml/clustered_users.csv")


@app.get("/")
def home():
    return {"message": "Backend is running"}

@app.get("/compare/{user_id}")
def compare_user(user_id: str):

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