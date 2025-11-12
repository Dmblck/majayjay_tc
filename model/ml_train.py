from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
import json
import pandas as pd
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
import joblib

app = Flask(__name__)
CORS(app)

MODEL_FILE = "preference_model.pkl"

def fetch_user_preferences():
    db = mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="majayjay_tourism"
    )
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT id, preferences FROM users")
    rows = cursor.fetchall()
    db.close()

    data = []
    user_ids = []

    for row in rows:
        try:
            prefs = json.loads(row["preferences"])
            if isinstance(prefs, list):
                data.append(prefs)
                user_ids.append(row["id"])
        except:
            continue

    return user_ids, data

@app.route("/api/ml/train", methods=["POST"])
def train_model():
    user_ids, all_prefs = fetch_user_preferences()

    if not all_prefs:
        return jsonify({
            "success": False,
            "message": "No user preferences found"
        })

    mlb = MultiLabelBinarizer()
    X = mlb.fit_transform(all_prefs)
    
    # Dummy target: just predicting user ID (for example purposes)
    y = user_ids

    # Split into train/test
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Train a simple classifier
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # Evaluate
    accuracy = model.score(X_test, y_test)

    # Save model and binarizer
    joblib.dump((model, mlb), MODEL_FILE)

    return jsonify({
        "success": True,
        "accuracy": round(accuracy, 2),
        "topPreferences": mlb.classes_.tolist()
    })

@app.route("/api/ml/predict", methods=["POST"])
def predict_preferences():
    data = request.json
    input_prefs = data.get("preferences", [])

    try:
        model, mlb = joblib.load(MODEL_FILE)
    except:
        return jsonify({
            "success": False,
            "message": "Model not trained yet"
        })

    X_input = mlb.transform([input_prefs])
    pred_user_id = model.predict(X_input)[0]

    return jsonify({
        "success": True,
        "predictedUserId": pred_user_id
    })


if __name__ == "__main__":
    app.run(port=5001)
