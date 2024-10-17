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
        
        # Check if the model is a Pipeline or ColumnTransformer
        if hasattr(model, 'transform') and callable(getattr(model, 'transform')):
            # If it's a ColumnTransformer, we need to extract the feature names from the transformers
            feature_names = []
            for name, transformer, columns in model.transformers_:
                if hasattr(transformer, 'get_feature_names_out'):
                    feature_names.extend(transformer.get_feature_names_out(columns))
                else:
                    feature_names.extend(columns)  # Use original column names if no feature names are available
            
            model.feature_names_in_ = feature_names  # Set the feature names in the model
            
            # Create a small dummy dataset to fit the model
            dummy_data = pd.DataFrame({col: [0] for col in feature_names})
            model.fit(dummy_data, [0])  # Fit with dummy data
            logging.info("Model fitted with dummy data to ensure all transformers are ready.")
        
        return model
    except Exception as e:
        logging.error(f"Failed to load or prepare the model: {e}")
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
            
            # Add most common BER rating feature
            ber_feature_name = f'most_common_ber_rating_within_{radius}km'
            ber_value = data.get(ber_feature_name, 'Unknown')
            features[ber_feature_name] = ber_value
            logging.debug(f"Feature {ber_feature_name}: {ber_value}")
        
        df = pd.DataFrame([features])
        
        logging.debug(f"Prepared feature DataFrame: {df}")
        logging.info(f"Number of features prepared: {len(df.columns)}")
        
        return df
    except Exception as e:
        logging.error(f"Error preparing features: {e}")
        raise

def predict(data):
    try:
        model_path = os.path.join('/tmp', 'xgboost_model.joblib')
        model = load_model(model_path)

        features_df = prepare_features(data)
        
        if hasattr(model, 'feature_names_in_'):
            missing_features = set(model.feature_names_in_) - set(features_df.columns)
            extra_features = set(features_df.columns) - set(model.feature_names_in_)
            
            if missing_features:
                logging.warning(f"Missing features: {missing_features}")
            if extra_features:
                logging.warning(f"Extra features that will be ignored: {extra_features}")

            for feature in model.feature_names_in_:
                if feature not in features_df.columns:
                    features_df[feature] = 0
            features_df = features_df[model.feature_names_in_]

        predictions = model.predict(features_df)
        prediction = float(predictions[0])
        
        return {"prediction": prediction}

    except Exception as e:
        logging.error(f"An error occurred: {e}")
        logging.error(traceback.format_exc())
        return {"error": str(e)}
