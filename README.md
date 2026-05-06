# Email Phishing Detection Tool

## Overview
A web-based proof-of-concept application and extension designed to identify email phishing attempts[cite: 1]. 

## Critical Assessment & Current Limitations
**Status: Not Production Ready**
In its current state, this tool does not meet the accuracy standards required for college-level grading or enterprise deployment. 
*   **Low Accuracy:** The underlying detection logic generates too many false positives/negatives.
*   **Static Data Dependency:** It relies on a static, limited dataset (`CEAS_08.csv`) rather than dynamic threat intelligence[cite: 1].
*   **Lack of Scalability:** The current architecture is suitable only for local prototyping.

## Tech Stack
*   **Frontend:** HTML, CSS, Vanilla JavaScript[cite: 1]
*   **Backend:** Python (`app.py`)[cite: 1]
*   **Data Storage:** Static CSV (`CEAS_08.csv`)[cite: 1]

## Repository Structure
*   `/Website/` - Contains frontend UI components (`index.html`, `style.css`, `script.js`)[cite: 1]
*   `/backend/` - Contains the primary dataset (`CEAS_08.csv`)[cite: 1]
*   `app.py` - Core backend application and API routing[cite: 1]

## Roadmap to Enterprise Readiness
To transform this prototype into a viable, corporate-level security tool, the following architectural shifts are necessary:
1.  **Machine Learning Overhaul:** Deprecate static dataset matching. Implement advanced NLP models (like BERT or RoBERTa) to analyze the semantic context of email bodies and headers.
2.  **Dynamic Threat Feeds:** Integrate live API feeds (e.g., VirusTotal, PhishTank) to evaluate URLs and sender domains in real-time.
3.  **Containerization & Microservices:** Dockerize the application and split the frontend, inference engine, and API into deployable microservices.
4.  **Telemetry & Logging:** Implement robust logging for detected threats to feed back into the model's training pipeline.

## How to Run (Development Mode)
1. Ensure Python 3.x is installed.
2. Install necessary backend dependencies (e.g., `pip install flask pandas scikit-learn`).
3. Run the backend server: `python app.py`[cite: 1].
4. Load the `/Website/` directory into your browser or install it as an unpacked extension[cite: 1].
