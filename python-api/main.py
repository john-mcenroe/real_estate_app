import os
import json
import logging
from flask import Flask, request, jsonify
import functions_framework
from generate_columns import generate_columns
from predict import predict
import numpy as np

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif np.isnan(obj):
            return None
        return super(NumpyEncoder, self).default(obj)

@functions_framework.http
def python_api(request):
    """HTTP Cloud Function entry point."""
    return app(request.environ, lambda x, y: [])

@app.route('/generate_columns', methods=['POST'])
def generate_columns_api():
    try:
        data = request.get_json()
        result = generate_columns(data)
        return json.dumps(result, cls=NumpyEncoder), 200, {'Content-Type': 'application/json'}
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/predict', methods=['POST'])
def predict_api():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No input data provided"}), 400
        result = predict(data)
        return jsonify(result)
    except Exception as e:
        logging.exception(f"Error in predict: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
