from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import re
import string
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Download NLTK data
nltk.download('stopwords')
nltk.download('wordnet')
nltk.download('omw-1.4')

STOP_WORDS = set(stopwords.words('english'))
lemmatizer = WordNetLemmatizer()

def clean_text(text):
    if not text:
        return ""
    
    text = re.sub(r'http\S+|www\.\S+', '', text)
    text = re.sub(r'<.*?>', '', text)
    text = text.lower()
    text = text.translate(str.maketrans('', '', string.punctuation))
    
    # Tokenize and lemmatize
    tokens = nltk.word_tokenize(text)
    tokens = [lemmatizer.lemmatize(token) for token in tokens if token.isalpha() and token not in STOP_WORDS]
    
    return " ".join(tokens)

# Load models and vectorizer
try:
    models_dir = os.path.join(os.path.dirname(__file__), 'backend', 'models')
    tfidf_path = os.path.join(models_dir, 'tfidf_vectorizer.pkl')
    model_path = os.path.join(models_dir, 'random_forest_model.pkl')
    
    with open(tfidf_path, 'rb') as f:
        tfidf = pickle.load(f)
    with open(model_path, 'rb') as f:
        model = pickle.load(f)
except Exception as e:
    print(f"Error loading models: {e}")
    tfidf = None
    model = None

# ✅ Root route
@app.route('/')
def home():
    return jsonify({
        "message": "Flask API is running 🚀",
        "endpoints": {
            "predict": "/predict (POST)"
        }
    })

# ✅ Favicon route (to stop 404 spam in logs)
@app.route('/favicon.ico')
def favicon():
    return "", 204  # No Content

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Combine subject, body, and URLs for analysis
        combined_text = f"{data.get('subject', '')} {data.get('body', '')} {data.get('urls', '')}"
        cleaned_text = clean_text(combined_text)
        
        if not cleaned_text.strip():
            return jsonify({'error': 'No text content to analyze'}), 400
        
        # Transform and predict
        features = tfidf.transform([cleaned_text])
        prediction = model.predict(features)[0]
        
        # Get confidence score
        if hasattr(model, "predict_proba"):
            confidence = model.predict_proba(features)[0][1] if prediction == 1 else model.predict_proba(features)[0][0]
        elif hasattr(model, "decision_function"):
            confidence = model.decision_function(features)[0]
            # Normalize to 0-1 range
            confidence = 1 / (1 + pow(2.71828, -confidence))
        else:
            confidence = 0.8 if prediction == 1 else 0.2
        
        return jsonify({
            'prediction': int(prediction),
            'confidence': float(confidence),
            'indicators': ['ML model analysis completed']
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
