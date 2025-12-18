# Import libraries
import pandas as pd
import numpy as np
import re
import string
import pickle

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import LinearSVC
from sklearn.metrics import classification_report, accuracy_score, roc_auc_score

from imblearn.over_sampling import SMOTE

import nltk
from nltk.corpus import stopwords

import spacy

import matplotlib.pyplot as plt
import seaborn as sns

# Download required resources
nltk.download('stopwords')

# Initialize NLP pipeline
STOP_WORDS = set(stopwords.words('english'))
nlp = spacy.load('en_core_web_sm')

# Define text cleaning function
def clean_text(text, urls=''):
    # Combine email text and URLs field into one string
    combined_text = str(text) + ' ' + str(urls)
    
    # Remove URLs
    combined_text = re.sub(r'http\S+|www\.\S+', '', combined_text)
    
    # Remove HTML tags
    combined_text = re.sub(r'<.*?>', '', combined_text)
    
    # Lowercase
    combined_text = combined_text.lower()
    
    # Remove punctuation
    combined_text = combined_text.translate(str.maketrans('', '', string.punctuation))
    
    # Tokenize, lemmatize, remove stopwords and non-alpha tokens
    tokens = [
        token.lemma_ for token in nlp(combined_text) 
        if token.text.isalpha() and token.text not in STOP_WORDS
    ]
    
    return " ".join(tokens)

# ----------- Load and preprocess data -----------

# Load your dataset (adjust path as needed)
df = pd.read_csv(r'K:\PydroidX\CEAS_08.csv')


# Combine subject and body for text analysis
df['text'] = df['subject'].astype(str) + ' ' + df['body'].astype(str)

# Apply cleaning to combined text + URLs
df['clean_text'] = df.apply(lambda row: clean_text(row['text'], row['urls']), axis=1)

print("Sample cleaned text:")
print(df['clean_text'].head())

# ----------- Feature extraction -----------

X = df['clean_text']
y = df['label']  # assuming 1=phishing/spam, 0=legitimate

# Vectorize text using TF-IDF
tfidf = TfidfVectorizer(max_features=5000)
X_tfidf = tfidf.fit_transform(X)

# Handle imbalanced dataset using SMOTE
smote = SMOTE(random_state=42)
X_resampled, y_resampled = smote.fit_resample(X_tfidf, y)

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X_resampled, y_resampled, test_size=0.2, random_state=42)

# ----------- Model training & evaluation -----------

models = {
    'Naive Bayes': MultinomialNB(),
    'Logistic Regression': LogisticRegression(max_iter=1000),
    'Random Forest': RandomForestClassifier(n_estimators=100, random_state=42),
    'SVM': LinearSVC()
}

results = {}

for name, model in models.items():
    print(f"\nTraining {name}...")
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    
    # Accuracy and ROC-AUC
    acc = accuracy_score(y_test, y_pred)
    try:
        # SVM LinearSVC doesn't have predict_proba, use decision_function instead for ROC-AUC
        if hasattr(model, "predict_proba"):
            y_proba = model.predict_proba(X_test)[:, 1]
            roc = roc_auc_score(y_test, y_proba)
        else:
            y_scores = model.decision_function(X_test)
            roc = roc_auc_score(y_test, y_scores)
    except Exception as e:
        print("Could not calculate ROC-AUC:", e)
        roc = None

    print(f"{name} Classification Report:")
    print(classification_report(y_test, y_pred))
    print(f"{name} Accuracy: {acc:.4f}")
    if roc is not None:
        print(f"{name} ROC-AUC: {roc:.4f}")
    
    results[name] = {'model': model, 'accuracy': acc, 'roc_auc': roc}

    # Save model to disk
    model_filename = f"{name.replace(' ', '_').lower()}_model.pkl"
    with open(model_filename, 'wb') as f:
        pickle.dump(model, f)

# Save vectorizer
with open('tfidf_vectorizer.pkl', 'wb') as f:
    pickle.dump(tfidf, f)

# ----------- Visualization of Model Performance -----------

model_names = list(results.keys())
accuracies = [results[m]['accuracy'] for m in model_names]
roc_aucs = [results[m]['roc_auc'] if results[m]['roc_auc'] is not None else 0 for m in model_names]

plt.figure(figsize=(10,6))
bar_width = 0.35
index = np.arange(len(model_names))

plt.bar(index, accuracies, bar_width, label='Accuracy', color='skyblue')
plt.bar(index + bar_width, roc_aucs, bar_width, label='ROC-AUC', color='salmon')

plt.xlabel('Models')
plt.ylabel('Scores')
plt.title('Model Performance Comparison')
plt.xticks(index + bar_width / 2, model_names)
plt.ylim([0,1])
plt.legend()
plt.show()
