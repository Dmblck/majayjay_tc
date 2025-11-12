from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd

app = Flask(__name__)
CORS(app) 

model = joblib.load("tourist_route_model.pkl")  

freq_map = {3: "Very High", 2: "High", 1: "Moderate", 0: "Low"}

spots_df = pd.read_csv(
    "../public/data/spots.csv",
    on_bad_lines="skip",
    quotechar='"',
    engine="python"
)
spots_df.fillna("", inplace=True)

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()

    user_preferences = data.get("userPreferences", {"preferNature": 1, "preferCulture": 0})
    weather = data.get("weather", {"weather": [{"main": "Clear"}]})
    weather_clear = 1 if "rain" not in weather["weather"][0]["main"].lower() else 0

    results = []

    for i, row in spots_df.iterrows():
        spot_type = row["tags"] if "tags" in row else ""

        features = [
            int(user_preferences.get("preferNature", 0) and "nature" in spot_type.lower()),
            int(user_preferences.get("preferCulture", 0) and "history" in spot_type.lower()),
            weather_clear,
            i  # distance to previous
        ]

        pred = model.predict([features])[0]

        spot_data = {
            "id": row.get("id"),
            "name": row.get("name"),
            "lat": row.get("lat"),
            "lng": row.get("lng"),
            "visitors": row.get("visitors"),
            "tags": row.get("tags"),
            "description": row.get("description"),
            "image": row.get("image"),
            "predicted_frequency": freq_map.get(pred, "Moderate")
        }

        results.append(spot_data)

    # Sort by predicted_frequency (Very High -> Low)
    results.sort(key=lambda x: ["Low", "Moderate", "High", "Very High"].index(x["predicted_frequency"]), reverse=True)

    return jsonify({"route": results})


if __name__ == "__main__":
    app.run(port=5001, debug=True)