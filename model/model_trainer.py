# model_trainer.py
import pandas as pd
import mysql.connector
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import SGDClassifier
import pickle

DB_CONFIG = {
    "host": "127.0.0.1",
    "user": "root",
    "password": "",
    "database": "majayjay_tourism"
}

MODEL_PATH = "ml_model.pkl"
VECTORIZER_PATH = "vectorizer.pkl"

def train_model():
    conn = mysql.connector.connect(**DB_CONFIG)
    df = pd.read_sql("""
        SELECT f.user_id, p.id AS poi_id, p.tags, p.name, p.description, f.liked
        FROM user_feedback f
        JOIN pois p ON f.poi_id = p.id
    """, conn)
    conn.close()

    if df.empty:
        print("No feedback data to train on.")
        return

    df['text'] = (df['tags'].fillna('') + " " +
                  df['name'].fillna('') + " " +
                  df['description'].fillna('')).str.lower()

    vectorizer = TfidfVectorizer()
    X = vectorizer.fit_transform(df['text'])
    y = df['liked'].values

    clf = SGDClassifier(loss='log_loss')
    clf.fit(X, y)

    with open(MODEL_PATH, "wb") as f:
        pickle.dump(clf, f)
    with open(VECTORIZER_PATH, "wb") as f:
        pickle.dump(vectorizer, f)

    print("Model trained and saved successfully.")
# At the very end of model_trainer.py, after train_model() is called
import pickle

with open("ml_model.pkl", "rb") as f:
    clf = pickle.load(f)

with open("vectorizer.pkl", "rb") as f:
    vectorizer = pickle.load(f)

print("Model loaded:", clf)
print("Vectorizer loaded:", vectorizer)

# Optional: test prediction on a sample
sample_text = ["beach historical museum"]
X = vectorizer.transform(sample_text)
predicted_prob = clf.predict_proba(X)[:, 1]
print("Predicted liked probability:", predicted_prob)

if __name__ == "__main__":
    train_model()
