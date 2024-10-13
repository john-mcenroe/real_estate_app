import sys
import json
import logging
import os
import traceback
import joblib  # For loading the XGBoost model

def load_model(model_path):
    try:
        model = joblib.load(model_path)
        logging.info("XGBoost model loaded successfully.")
        return model
    except Exception as e:
        logging.error(f"Failed to load the model: {e}")
        raise

def prepare_features(data):
    """
    Prepare the feature vector for prediction.
    Ensure that the feature names and order match the training data.
    """
    try:
        # Example: Assuming the model expects the following features
        feature_order = [
            'avg_sold_price_within_1km',
            'median_sold_price_within_1km',
            'avg_asking_price_within_1km',
            'median_asking_price_within_1km',
            'avg_price_delta_within_1km',
            'median_price_delta_within_1km',
            'avg_price_per_sqm_within_1km',
            'median_price_per_sqm_within_1km',
            'most_common_ber_rating_within_1km',
            'property_type_distribution_within_1km',
            'avg_bedrooms_within_1km',
            'avg_bathrooms_within_1km',
            'nearby_properties_count_within_1km',
            # Add more features as required
        ]

        features = []
        for feature in feature_order:
            value = data.get(feature)
            if isinstance(value, dict):
                # For distribution features, you might need to handle them appropriately
                # For simplicity, we'll take the proportion of 'House' as an example
                value = value.get('House', 0)
            features.append(value if value is not None else 0)
        
        logging.debug(f"Prepared feature vector: {features}")
        return [features]  # XGBoost expects a 2D array
    except Exception as e:
        logging.error(f"Error preparing features: {e}")
        raise

def main():
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(levelname)s - %(message)s',
        stream=sys.stderr
    )

    try:
        # Load the trained XGBoost model
        model_path = os.path.join(os.path.dirname(__file__), 'xgboost_model.joblib')
        model = load_model(model_path)

        # Read input JSON from stdin
        input_data = sys.stdin.read()
        if not input_data:
            logging.error("No input data provided.")
            print(json.dumps({"error": "No input data provided"}))
            sys.exit(1)

        try:
            data = json.loads(input_data)
            logging.debug(f"Received input data: {data}")
        except json.JSONDecodeError as e:
            logging.error(f"JSON decode error: {e}")
            print(json.dumps({"error": f"Invalid JSON input: {e}"}))
            sys.exit(1)

        # Prepare features for prediction
        features = prepare_features(data)

        # Run prediction
        predictions = model.predict(features)
        logging.info(f"Prediction result: {predictions}")

        # Assuming a single prediction
        prediction = float(predictions[0])

        # Output the prediction as JSON
        print(json.dumps({"prediction": prediction}))

    except Exception as e:
        logging.error(f"An error occurred: {e}")
        logging.error(traceback.format_exc())
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()

