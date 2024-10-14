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
        
        # Log the received data
        logging.debug(f"Data received for feature preparation: {json.dumps(data, indent=2)}")
        
        # Basic features
        original_inputs = data.get('originalInputs', {})
        logging.debug(f"Original Inputs: {original_inputs}")
        
        basic_features = ['beds', 'baths', 'size', 'latitude', 'longitude']
        for feature in basic_features:
            value = float(original_inputs.get(feature, 0))
            features[feature if feature != 'size' else 'myhome_floor_area_value'] = value
            logging.debug(f"Feature {feature}: {value}")
        
        # Categorical features
        categorical_features = ['bedCategory', 'bathCategory', 'propertyTypeCategory', 'berCategory', 'sizeCategory']
        for feature in categorical_features:
            value = data.get(feature, 'Unknown')
            features[feature] = value
            logging.debug(f"Categorical Feature {feature}: {value}")
        
        # Property type and energy rating
        features['property_type'] = original_inputs.get('property_type', '').lower()
        logging.debug(f"Property Type: {features['property_type']}")
        
        features['energy_rating'] = original_inputs.get('ber_rating', '')
        logging.debug(f"Energy Rating: {features['energy_rating']}")
        
        # Add the missing energy_rating_numeric feature
        features['energy_rating_numeric'] = data.get('energy_rating_numeric', 0)
        logging.debug(f"Energy Rating Numeric: {features['energy_rating_numeric']}")
        
        # Nearby properties features
        for radius in [1, 3, 5]:
            for metric in ['nearby_properties_count', 'avg_sold_price', 'median_sold_price', 'avg_asking_price', 'median_asking_price', 'avg_price_delta', 'median_price_delta', 'avg_price_per_sqm', 'median_price_per_sqm', 'avg_bedrooms', 'avg_bathrooms']:
                feature_name = f'{metric}_within_{radius}km'
                value = data.get(feature_name, 0)
                features[feature_name] = value
                logging.debug(f"Feature {feature_name}: {value}")
        
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
        logging.info(f"Prepared features: {features_df.columns.tolist()}")

        # Log the input column values used for prediction
        logging.info(f"Input column values for prediction:\n{features_df.to_dict(orient='records')[0]}")

        # Compare prepared features with model features
        if hasattr(model, 'feature_names_in_'):
            missing_features = set(model.feature_names_in_) - set(features_df.columns)
            extra_features = set(features_df.columns) - set(model.feature_names_in_)
            
            if missing_features:
                logging.warning(f"Missing features: {missing_features}")
            if extra_features:
                logging.warning(f"Extra features that will be ignored: {extra_features}")

        predictions = model.predict(features_df)
        logging.info(f"Prediction result: {predictions}")

        prediction = float(predictions[0])
        print(json.dumps({"prediction": prediction}))

        if hasattr(model, 'feature_importances_'):
            importances = model.feature_importances_
            feature_imp = pd.DataFrame({'feature': features_df.columns, 'importance': importances})
            feature_imp = feature_imp.sort_values('importance', ascending=False)
            logging.info(f"Feature importances:\n{feature_imp}")

    except Exception as e:
        logging.error(f"An error occurred: {e}")
        logging.error(traceback.format_exc())
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
