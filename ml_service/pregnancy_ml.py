from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
from sklearn.ensemble import IsolationForest
import numpy as np
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow your React app to talk to this Python server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, change this to your React app's URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 1. GENERATE DATA & TRAIN THE ML MODEL ---
print("🧠 Training Machine Learning Model...")
np.random.seed(42)

# Simulate 1000 healthy maternal vitals
normal_data = pd.DataFrame({
    'heartRate': np.random.normal(80, 10, 1000),
    'spo2': np.random.normal(98, 1.5, 1000),
    'hemoglobin': np.random.normal(12.5, 1.0, 1000)
})

# Simulate 50 dangerous/anomalous vitals
anomaly_data = pd.DataFrame({
    'heartRate': np.random.uniform(40, 130, 50),
    'spo2': np.random.uniform(85, 93, 50),
    'hemoglobin': np.random.uniform(7.0, 10.0, 50)
})

# Combine and train
training_data = pd.concat([normal_data, anomaly_data])
model = IsolationForest(contamination=0.05, random_state=42)
model.fit(training_data[['heartRate', 'spo2', 'hemoglobin']])
print("✅ Model Trained Successfully!")


# --- 2. DEFINE THE API INPUT ---
class Vitals(BaseModel):
    heartRate: float
    spo2: float
    hemoglobin: float


# --- 3. CREATE THE PREDICTION ENDPOINT ---
@app.post("/predict")
def predict_risk(vitals: Vitals):
    # Format incoming data from React
    input_data = pd.DataFrame(
        [[vitals.heartRate, vitals.spo2, vitals.hemoglobin]],
        columns=['heartRate', 'spo2', 'hemoglobin']
    )

    # Predict Anomaly: -1 means Risk Detected, 1 means Normal
    prediction = model.predict(input_data)[0]
    
    # Get the raw mathematical score from the Isolation Forest
    # Lower/Negative numbers mean higher danger.
    raw_anomaly_score = model.decision_function(input_data)[0]

    # Convert the raw math score into a 0-100% Safety Score for React
    normalized_score = max(0, min(100, int((raw_anomaly_score + 0.15) * 400)))
    
    is_risk = bool(prediction == -1)

    return {
        "isRisk": is_risk,
        "safetyScore": normalized_score,
        "message": "High Risk Anomaly Detected!" if is_risk else "Vitals Stable. Pattern Normal."
    }