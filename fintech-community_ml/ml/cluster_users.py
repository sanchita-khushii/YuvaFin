import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import numpy as np

# Load ML ready dataset
df = pd.read_csv("ml_ready_dataset.csv")

# Select features for clustering
features = df[[
    "spending_ratio",
    "debt_ratio",
    "credit_score",
    "transaction_count",
    "avg_transaction"
]]

# Normalize features
scaler = StandardScaler()
scaled_features = scaler.fit_transform(features)

# Apply KMeans
kmeans = KMeans(n_clusters=5, random_state=42)
df["cluster"] = kmeans.fit_predict(scaled_features)
persona_map = {
    0: "Debt Heavy",
    1: "Stable Saver",
    2: "Affluent Professional",
    3: "Premium Low Risk",
    4: "Active High Spender"
}

df["persona"] = df["cluster"].map(persona_map)


df["income_bracket"] = pd.qcut(
    df["yearly_income"],
    4,
    labels=["Low Income", "Lower Middle", "Upper Middle", "High Income"]
)

# Percentile within income bracket
df["spending_percentile"] = df.groupby("income_bracket")["spending_ratio"]\
    .rank(pct=True) * 100

df["debt_percentile"] = df.groupby("income_bracket")["debt_ratio"]\
    .rank(pct=True) * 100

df["credit_percentile"] = df.groupby("income_bracket")["credit_score"]\
    .rank(pct=True) * 100

# Percentile within same persona
df["persona_spending_percentile"] = df.groupby("persona")["spending_ratio"]\
    .rank(pct=True) * 100

# Save clustered dataset
df.to_csv("clustered_users.csv", index=False)

print("Clustering completed successfully!")

print(df.groupby("cluster")[[
    "spending_ratio",
    "debt_ratio",
    "credit_score",
    "transaction_count",
    "avg_transaction"
]].mean())
