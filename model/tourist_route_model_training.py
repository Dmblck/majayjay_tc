import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import joblib

# Load spots CSV
df = pd.read_csv("../public/data/spots.csv")

# Encode visitor frequency
visitor_mapping = {'Low': 0, 'Moderate': 1, 'High': 2, 'Very High': 3}
df['visitor_frequency_encoded'] = df['visitors'].map(visitor_mapping)

# Feature engineering
df['user_preference_nature'] = df['tags'].apply(lambda x: 1 if 'nature' in str(x).lower() else 0)
df['user_preference_culture'] = df['tags'].apply(lambda x: 1 if 'culture' in str(x).lower() else 0)
df['weather_clear'] = 1  # For demo, assume clear weather
df['distance_to_previous'] = np.random.randint(1, 10, size=len(df))  # Random distance for demo

# Select features and target
X = df[['user_preference_nature', 'user_preference_culture', 'weather_clear', 'distance_to_previous']]
y = df['visitor_frequency_encoded']

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train RandomForest model
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
print(f"Model Accuracy: {accuracy:.2f}")

# Save trained model
joblib.dump(model, 'tourist_route_model.pkl')
