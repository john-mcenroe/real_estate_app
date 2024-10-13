import sys
import json
import logging
import os
import traceback
import joblib  # For loading the XGBoost model
import xgboost as xgb
import pandas as pd

logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s', stream=sys.stderr)

def load_model(model_path):
    try:
        model = joblib.load(model_path)
        logging.info("XGBoost model loaded successfully.")
        return model
    except Exception as e:
        logging.error(f"Failed to load the model: {e}")
        raise

def prepare_features(data):
    try:
        features = {}
        
        # Basic features (5)
        basic_features = ['beds', 'baths', 'size', 'latitude', 'longitude']
        for feature in basic_features:
            if feature in ['beds', 'baths', 'size']:
                features[feature] = float(data['originalInputs'].get(feature, 0))
            else:
                features[feature] = data.get(feature, 0)
        
        # Nearby properties features (21)
        for distance in ['1km', '3km', '5km']:
            for metric in ['nearby_properties_count', 'avg_sold_price', 'median_sold_price', 'avg_asking_price', 'median_asking_price', 'avg_price_delta', 'median_price_delta']:
                feature_name = f'{metric}_within_{distance}'
                features[feature_name] = data.get(feature_name, 0)
        
        # Property type (as a string, not one-hot encoded)
        features['property_type'] = data['originalInputs'].get('property_type', '').lower()
        
        # Energy rating
        features['energy_rating'] = data['originalInputs'].get('energy_rating', '')
        
        df = pd.DataFrame([features])
        
        logging.debug(f"Prepared feature DataFrame: {df}")
        logging.info(f"Number of features prepared: {len(df.columns)}")
        
        return df
    except Exception as e:
        logging.error(f"Error preparing features: {e}")
        raise

def main():
    try:
        model_path = os.path.join(os.path.dirname(__file__), 'xgboost_model.joblib')
        model = load_model(model_path)

        # Log model information
        if hasattr(model, 'feature_names_in_'):
            logging.info(f"Model expects these features: {model.feature_names_in_}")
            logging.info(f"Number of features expected by model: {len(model.feature_names_in_)}")
        else:
            logging.warning("Unable to determine model's expected features.")

        input_data = sys.stdin.read()
        if not input_data:
            logging.error("No input data provided.")
            print(json.dumps({"error": "No input data provided"}))
            sys.exit(1)

        data = json.loads(input_data)
        logging.debug(f"Received input data: {data}")

        features_df = prepare_features(data)
        logging.info(f"Number of features prepared: {features_df.shape[1]}")
        logging.info(f"Prepared features: {features_df.to_dict(orient='records')}")

        predictions = model.predict(features_df)
        logging.info(f"Prediction result: {predictions}")

        prediction = float(predictions[0])
        print(json.dumps({"prediction": prediction}))

    except Exception as e:
        logging.error(f"An error occurred: {e}")
        logging.error(traceback.format_exc())
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
