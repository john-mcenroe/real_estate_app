import os
import json
import logging
import traceback
from flask import Flask, request, jsonify, Response, make_response
import functions_framework
from generate_columns import generate_columns
from predict import predict
import numpy as np

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.DEBUG)

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, (dict, list)):
            return json.dumps(obj)
        return super(NumpyEncoder, self).default(obj)

def is_json_serializable(value):
    """Check if a value is JSON serializable."""
    return isinstance(value, (str, int, float, bool, type(None)))

def filter_json_serializable(data):
    """Recursively filter out non-JSON-serializable values from a dictionary."""
    if isinstance(data, dict):
        return {k: filter_json_serializable(v) for k, v in data.items() if is_json_serializable(v) or isinstance(v, (dict, list))}
    elif isinstance(data, list):
        return [filter_json_serializable(item) for item in data if is_json_serializable(item) or isinstance(item, (dict, list))]
    else:
        return data

# Determine API environment
api_env = os.getenv('API_ENV', 'local')
api_url = os.getenv('API_URL', 'http://localhost:8080')  # Default to local

if api_env == 'local':
    logging.info("Using local Flask API.")
    logging.info(f"API URL: {api_url}")
else:
    logging.info("Using Google Cloud API.")
    logging.info(f"API URL: {api_url}")

@functions_framework.http
def python_api(request):
    with app.app_context():
        if request.path == '/generate_columns':
            return generate_columns_api(request)
        elif request.path == '/predict':
            return predict_api(request)
        elif request.path == '/':
            return health_check(request)
        else:
            return jsonify({"error": "Not Found"}), 404

@app.route('/generate_columns', methods=['POST'])
def generate_columns_api():
    try:
        data = request.get_json()
        logging.info(f"Received data: {data}")
        
        result = generate_columns(data)
        
        logging.info("Raw output from generate_columns:")
        logging.info(result)
        
        # Ensure the result is JSON serializable
        json_safe_result = json.loads(json.dumps(result, default=str))
        
        logging.info("JSON-safe result:")
        logging.info(json_safe_result)
        
        return jsonify(json_safe_result), 200

    except Exception as e:
        logging.error(f"Error in generate_columns: {str(e)}")
        logging.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

def predict_api(request):
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No input data provided"}), 400
        result = predict(data)
        
        # Print raw output
        logging.info("Raw output from predict:")
        logging.info(result)
        
        # Try to serialize to JSON
        try:
            json_result = json.dumps(result, cls=NumpyEncoder)
            logging.info("JSON serialization successful")
        except Exception as json_error:
            logging.error(f"JSON serialization failed: {str(json_error)}")
            return jsonify({"error": "Failed to serialize result"}), 500
        
        return Response(json_result, mimetype='application/json')
    except Exception as e:
        logging.error(f"Error in predict: {str(e)}")
        logging.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

def health_check(request):
    return jsonify({"status": "healthy"}), 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port, debug=True)
