import pandas as pd
import mysql.connector
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import SGDClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import precision_score, recall_score, f1_score
import pickle

DB_CONFIG = {
    "host": "127.0.0.1",
    "user": "root",
    "password": "",
    "database": "majayjay_tourism"
}

# Load feedback data from database
conn = mysql.connector.connect(**DB_CONFIG)
df = pd.read_sql("""
    SELECT f.liked, p.tags, p.name, p.description
    FROM user_feedback f
    JOIN pois p ON f.poi_id = p.id
""", conn)
conn.close()

if df.empty:
    print("No feedback data available.")
    exit()

# Combine text fields for vectorization
df['text'] = (df['tags'].fillna('') + " " +
              df['name'].fillna('') + " " +
              df['description'].fillna('')).str.lower()

X_text = df['text']
y = df['liked'].values

# Vectorize text
vectorizer = TfidfVectorizer()
X = vectorizer.fit_transform(X_text)

# Split dataset (small dataset, no stratify)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train classifier
clf = SGDClassifier(loss='log_loss')
clf.fit(X_train, y_train)

# Predict on test set
y_pred = clf.predict(X_test)

# Evaluate metrics
precision = precision_score(y_test, y_pred, zero_division=0)
recall = recall_score(y_test, y_pred, zero_division=0)
f1 = f1_score(y_test, y_pred, zero_division=0)

print(f"Precision: {precision:.3f}")
print(f"Recall:    {recall:.3f}")
print(f"F1 Score:  {f1:.3f}")

# Optional: save the model and vectorizer for Flask usage
with open("ml_model.pkl", "wb") as f:
    pickle.dump(clf, f)
with open("vectorizer.pkl", "wb") as f:
    pickle.dump(vectorizer, f)

print("Model and vectorizer saved successfully.")
