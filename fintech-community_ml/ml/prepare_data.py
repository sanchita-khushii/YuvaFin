import pandas as pd

# Load dataset
df = pd.read_csv("C:/Users/vanya/Downloads/Customer_financial_profiles.csv")

# Convert date column
df['date'] = pd.to_datetime(df['date'], dayfirst=True)

# ---- Aggregate per client ----
user_df = df.groupby("client_id").agg({
    "yearly_income": "first",
    "total_debt": "first",
    "credit_score": "first",
    "num_credit_cards": "first",
    "amount": ["sum", "mean", "count"]
}).reset_index()

# Flatten column names
user_df.columns = [
    "client_id",
    "yearly_income",
    "total_debt",
    "credit_score",
    "num_credit_cards",
    "total_spent",
    "avg_transaction",
    "transaction_count"
]

# ---- Create Behavioral Ratios ----
user_df["spending_ratio"] = user_df["total_spent"] / user_df["yearly_income"]
user_df["debt_ratio"] = user_df["total_debt"] / user_df["yearly_income"]

# Save processed dataset
user_df.to_csv("ml_ready_dataset.csv", index=False)

print("ML Ready Dataset Created Successfully!")
