from flask import Flask, request, jsonify
import pickle
import numpy as np

app = Flask(__name__)

# Load models
with open('models/tfidf_vectorizer.pkl', 'rb') as f:
    vectorizer = pickle.load(f)
    
with open('models/logistic_regression_model.pkl', 'rb') as f:  # or your best model
    model = pickle.load(f)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    
    # Combine subject and body
    text = f"{data.get('subject', '')} {data.get('body', '')}"
    
    # Clean the text
    cleaned_text = clean_text(text)
    
    # Vectorize
    features = vectorizer.transform([cleaned_text])
    
    # Predict
    prediction = model.predict(features)[0]
    proba = model.predict_proba(features)[0][1]  # Probability of being phishing
    
    # Generate indicators based on features
    indicators = generate_indicators(cleaned_text, features)
    
    return jsonify({
        'prediction': int(prediction),
        'confidence': float(proba),
        'indicators': indicators
    })

def generate_indicators(text, features):
    """Generate human-readable indicators based on model features"""
    indicators = []
    
    # Check for urgency words
    urgency_words = ['urgent', 'immediately', 'action required', 'verify now']
    if any(word in text.lower() for word in urgency_words):
        indicators.append("Urgent language detected")
    
    # Check for suspicious domains
    suspicious_domains = ['.xyz', '.top', '.gq', '.ml', '.tk']
    if any(domain in text.lower() for domain in suspicious_domains):
        indicators.append("Suspicious domain detected")
    
    # Check for impersonation attempts
    impersonation_keywords = ['paypal', 'bank', 'irs', 'microsoft', 'amazon']
    if any(keyword in text.lower() for keyword in impersonation_keywords):
        indicators.append("Possible impersonation attempt")
    
    if not indicators:
        indicators.append("No obvious phishing indicators detected")
    
    return indicators

if __name__ == '__main__':
    app.run(port=5000, debug=True)