import pandas as pd
import mysql.connector
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import SGDClassifier
from sklearn.metrics import precision_score, recall_score, f1_score
import pickle
import os
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')
    
DB_CONFIG = {
    "host": "127.0.0.1",
    "user": "root",
    "password": "",
    "database": "majayjay_tourism"
}

MODEL_PATH = "ml_model.pkl"
VECTORIZER_PATH = "vectorizer.pkl"

class PoiRecommenderHybrid:
    def __init__(self, user_id, db_config=DB_CONFIG, model_path=MODEL_PATH, vectorizer_path=VECTORIZER_PATH):
        self.user_id = user_id
        self.db_config = db_config
        self.model_path = model_path
        self.vectorizer_path = vectorizer_path
        self.df_pois = self.load_pois()
        self.clf, self.vectorizer = self.load_model()

    def load_pois(self):
        conn = mysql.connector.connect(**self.db_config)
        df = pd.read_sql("SELECT id, name, tags, description FROM pois", conn)
        conn.close()
        df['combined'] = (df['tags'].fillna('') + " " +
                          df['name'].fillna('') + " " +
                          df['description'].fillna('')).str.lower()
        return df

    def load_model(self):
        if os.path.exists(self.model_path) and os.path.exists(self.vectorizer_path):
            with open(self.model_path, "rb") as f:
                clf = pickle.load(f)
            with open(self.vectorizer_path, "rb") as f:
                vectorizer = pickle.load(f)
            return clf, vectorizer
        return None, None

    def train_model(self):
        conn = mysql.connector.connect(**self.db_config)
        df = pd.read_sql("""
            SELECT f.user_id, p.id AS poi_id, p.tags, p.name, p.description, f.liked
            FROM user_feedback f
            JOIN pois p ON f.poi_id = p.id
        """, conn)
        conn.close()

        if df.empty:
            return {"success": False, "error": "No feedback data available."}

        df['text'] = (df['tags'].fillna('') + " " +
                      df['name'].fillna('') + " " +
                      df['description'].fillna('')).str.lower()
        X_text = df['text']
        y = df['liked'].values

        vectorizer = TfidfVectorizer()
        X = vectorizer.fit_transform(X_text)

        clf = SGDClassifier(loss='log_loss')
        clf.fit(X, y)

        y_pred = clf.predict(X)
        precision = precision_score(y, y_pred, zero_division=0)
        recall = recall_score(y, y_pred, zero_division=0)
        f1 = f1_score(y, y_pred, zero_division=0)

        with open(MODEL_PATH, "wb") as f:
            pickle.dump(clf, f)
        with open(VECTORIZER_PATH, "wb") as f:
            pickle.dump(vectorizer, f)

        self.clf, self.vectorizer = clf, vectorizer

        return {"success": True, "precision": precision, "recall": recall, "f1": f1}

    def update_model(self, poi_id, liked):
        if self.clf is None or self.vectorizer is None:
            self.train_model()
            return
        poi_row = self.df_pois[self.df_pois['id'] == poi_id]
        if poi_row.empty:
            return
        text = poi_row.iloc[0]['combined']
        X_new = self.vectorizer.transform([text])
        y_new = [liked]
        self.clf.partial_fit(X_new, y_new, classes=[0,1])
        with open(MODEL_PATH, "wb") as f:
            pickle.dump(self.clf, f)

    def recommend(self, top_n=10, preferred_tags=None):
        conn = mysql.connector.connect(**self.db_config)
        cursor = conn.cursor()
        user_id_int = int(self.user_id)
        cursor.execute("SELECT poi_id, liked FROM user_feedback WHERE user_id=%s", (user_id_int,))
        feedback = cursor.fetchall()
        rated_ids = [row[0] for row in feedback]

        if len(feedback) == 0:
            cursor.execute("""
                SELECT poi_id, COUNT(*) as like_count
                FROM user_feedback
                WHERE liked=1
                GROUP BY poi_id
                ORDER BY like_count DESC
                LIMIT %s
            """, (top_n,))
            popular_ids = [row[0] for row in cursor.fetchall()]
            df_popular = self.df_pois[self.df_pois['id'].isin(popular_ids)].copy()
            if preferred_tags:
                preferred_tags_lower = [t.strip().lower() for t in preferred_tags]
                df_popular = df_popular[df_popular['tags'].apply(
                    lambda t: any(tag.strip().lower() in preferred_tags_lower for tag in (t or "").split(","))
                )]
            df_popular['score'] = 1
            cursor.close()
            conn.close()
            return df_popular.head(top_n).to_dict(orient='records')

        df_unrated = self.df_pois[~self.df_pois['id'].isin(rated_ids)].copy()

        liked_tags = []
        if feedback:
            cursor.execute("""
                SELECT tags FROM pois
                WHERE id IN (
                    SELECT poi_id FROM user_feedback
                    WHERE user_id=%s AND liked=1
                )
            """, (int(self.user_id),))
            liked_tags = [tag for row in cursor.fetchall() for tag in (row[0] or "").split(",")]

        cursor.close()
        conn.close()

        if liked_tags:
            liked_tags_lower = [t.strip().lower() for t in liked_tags]
            df_unrated = df_unrated[df_unrated['tags'].apply(
                lambda t: any(tag.strip().lower() in liked_tags_lower for tag in (t or "").split(",")) 
            )]

        if self.clf is not None and self.vectorizer is not None and not df_unrated.empty:
            X = self.vectorizer.transform(df_unrated['combined'])
            df_unrated['score'] = self.clf.predict_proba(X)[:,1]
        else:
            df_unrated['score'] = 0

        return df_unrated.sort_values('score', ascending=False).head(top_n).to_dict(orient='records')

    def evaluate_top_k(self, k=10):
        conn = mysql.connector.connect(**self.db_config)
        df_feedback = pd.read_sql("SELECT user_id, poi_id, liked FROM user_feedback", conn)
        df_pois = pd.read_sql("SELECT id, tags, name, description FROM pois", conn)
        conn.close()

        if df_feedback.empty or df_pois.empty:
            return {"precision_at_k": 0, "recall_at_k": 0}

        df_pois['combined'] = (df_pois['tags'].fillna('') + " " +
                               df_pois['name'].fillna('') + " " +
                               df_pois['description'].fillna('')).str.lower()

        users = df_feedback['user_id'].unique()
        precisions = []
        recalls = []

        for user in users:
            user_feedback = df_feedback[df_feedback['user_id']==user]
            liked_pois = user_feedback[user_feedback['liked']==1]['poi_id'].tolist()
            if not liked_pois:
                continue

            recommender = PoiRecommenderHybrid(int(user))
            if recommender.clf is None or recommender.vectorizer is None:
                recommender.train_model()
            recs = recommender.recommend(top_n=k)
            rec_ids = [r['id'] for r in recs]

            n_relevant = len(set(liked_pois) & set(rec_ids))
            precisions.append(n_relevant / k)
            recalls.append(n_relevant / len(liked_pois))

        precision_at_k = sum(precisions)/len(precisions) if precisions else 0
        recall_at_k = sum(recalls)/len(recalls) if recalls else 0

        return {"precision_at_k": precision_at_k, "recall_at_k": recall_at_k}

@app.route("/api/train_model", methods=["POST"])
def train_model_endpoint():
    recommender = PoiRecommenderHybrid(user_id=None)
    result = recommender.train_model()

    if result.get("success"):
        topk_metrics = recommender.evaluate_top_k(k=10)
        result.update(topk_metrics)

    return jsonify(result)

@app.route("/api/recommend", methods=["POST"])
def recommend_endpoint():
    data = request.json
    user_id = data.get("user_id")
    preferred_tags = data.get("preferred_tags", [])

    if not user_id:
        return jsonify({"error":"user_id is required"}), 400

    recommender = PoiRecommenderHybrid(user_id)
    if recommender.clf is None or recommender.vectorizer is None:
        recommender.train_model()

    recommendations = recommender.recommend(top_n=10, preferred_tags=preferred_tags)
    return jsonify(recommendations)

@app.route("/api/feedback", methods=["POST"])
def feedback():
    data = request.json
    user_id = data.get("user_id")
    poi_id = data.get("poi_id")
    liked = data.get("liked")

    if user_id is None or poi_id is None or liked is None:
        return jsonify({"error":"user_id, poi_id, and liked are required"}), 400

    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO user_feedback (user_id, poi_id, liked)
        VALUES (%s,%s,%s)
        ON DUPLICATE KEY UPDATE liked=%s
    """,(user_id, poi_id, liked, liked))
    conn.commit()
    cursor.close()
    conn.close()

    recommender = PoiRecommenderHybrid(user_id)
    recommender.update_model(poi_id, liked)

    return jsonify({"success":True})

if __name__=="__main__":
    from waitress import serve
    serve(app, host="0.0.0.0", port=5000)
