# ======================================
# Updated Script #2: Enhanced Column Generation
# ======================================

import json
import logging
import os
import traceback
import math
from dotenv import load_dotenv
from supabase import create_client, Client
from statistics import median, mode
import pandas as pd
import numpy as np
from flask import jsonify
from datetime import datetime, timedelta
import re

# ======================================
# Step 1: Configuration and Initialization
# ======================================

# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

# Load environment variables
load_dotenv()

# Fetch Supabase credentials from environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
if not SUPABASE_URL:
    logging.error("SUPABASE_URL is missing in the environment variables.")
    raise ValueError("SUPABASE_URL is missing in the environment variables.")
if not SUPABASE_URL.startswith('https://'):
    SUPABASE_URL = 'https://' + SUPABASE_URL
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_ANON_KEY:
    logging.error("Supabase credentials are missing in the environment variables.")
    raise ValueError("Supabase credentials are missing in the environment variables.")

# Initialize Supabase client
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    logging.info("Successfully connected to Supabase.")
except Exception as e:
    logging.error(f"Failed to connect to Supabase: {e}")
    raise

# ======================================
# Step 2: Define Helper Functions
# ======================================

def get_property_type_category(property_type):
    if not property_type:
        return 'Unknown'
    property_type = property_type.lower().strip()
    if property_type in ['apartment', 'flat', 'studio']:
        return 'Apartment'
    elif property_type in ['house', 'bungalow', 'cottage', 'villa', 'townhouse', 'end of terrace', 'terrace', 'semi-d', 'detached', 'duplex', 'semi-detached']:
        return 'House'
    else:
        return 'Other'

def get_bed_category(beds):
    try:
        beds = int(beds)
    except (ValueError, TypeError):
        logging.warning(f"Invalid bed count: {beds}")
        return "Unknown"
    if beds <= 1:
        return "Studio/1 Bed"
    elif beds == 2:
        return "2 Bed"
    elif beds == 3:
        return "3 Bed"
    else:
        return "4+ Bed"

def get_bath_category(baths):
    """
    Categorize the number of bathrooms.
    """
    if pd.isna(baths):
        return 'Unknown'
    try:
        baths = int(baths)
        if baths <= 1:
            return '1 or less'
        elif baths == 2:
            return '2'
        elif baths == 3:
            return '3'
        else:
            return '4 or more'
    except ValueError:
        return 'Unknown'

def get_ber_category(ber_rating):
    """
    Categorize BER ratings based on the provided rating.
    """
    if not ber_rating:
        return 'Unknown'
    ber_rating = ber_rating.upper().strip()
    if ber_rating in ['A1', 'A2', 'A3', 'A']:
        return 'A'
    elif ber_rating in ['B1', 'B2', 'B3', 'B']:
        return 'B'
    elif ber_rating in ['C1', 'C2', 'C3', 'C']:
        return 'C'
    elif ber_rating in ['D1', 'D2', 'D']:
        return 'D'
    elif ber_rating in ['E1', 'E2', 'E']:
        return 'E'
    elif ber_rating == 'F':
        return 'F'
    elif ber_rating == 'G':
        return 'G'
    else:
        return 'Unknown'

def get_size_category(size):
    try:
        size = float(size)
    except (ValueError, TypeError):
        logging.warning(f"Invalid size value: {size}")
        return 'Unknown'
    if size < 50:
        return 'Small'
    elif 50 <= size < 100:
        return 'Medium'
    elif 100 <= size < 150:
        return 'Large'
    else:
        return 'Very Large'

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the Haversine distance between two points in kilometers.
    """
    try:
        R = 6371.0  # Earth radius in kilometers

        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = math.sin(delta_phi / 2.0) ** 2 + \
            math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        distance = R * c
        return distance
    except Exception as e:
        logging.error(f"Error calculating Haversine distance: {e}")
        return None

def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the Haversine distance between two points in kilometers.
    """
    return haversine_distance(lat1, lon1, lat2, lon2)

def safe_divide(numerator, denominator):
    """
    Safely divide two numbers, returning None if the division is not possible.
    """
    if pd.isna(numerator) or pd.isna(denominator) or denominator == 0:
        return None
    return numerator / denominator

def ber_to_numeric(ber):
    """
    Convert BER rating to a numeric value.
    A1 is the best (highest value), G is the worst (lowest value).
    """
    ber_order = ['A', 'A1', 'A2', 'A3', 'B', 'B1', 'B2', 'B3', 
                'C', 'C1', 'C2', 'C3', 'D', 'D1', 'D2', 
                'E', 'E1', 'E2', 'F', 'G']
    if pd.isna(ber) or ber == '--' or ber not in ber_order:
        return np.nan
    return float(len(ber_order) - ber_order.index(ber))

def replace_nan(obj):
    """
    Recursively replace NaN values with None in dictionaries and lists.
    """
    if isinstance(obj, float) and math.isnan(obj):
        return None
    elif isinstance(obj, dict):
        return {k: replace_nan(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [replace_nan(element) for element in obj]
    else:
        return obj

def calculate_days_on_market(first_list_date, sale_date):
    """
    Calculate the number of days a property was on the market.
    """
    if pd.notna(first_list_date) and pd.notna(sale_date):
        return (sale_date - first_list_date).days
    return None

def calculate_price_change_percentage(first_list_price, sale_price):
    """
    Calculate the percentage change between first list price and sale price.
    """
    if pd.notna(first_list_price) and pd.notna(sale_price) and first_list_price > 0:
        return ((sale_price - first_list_price) / first_list_price) * 100
    return None

def extract_numeric(value):
    """
    Extract numeric value from a string.
    """
    if pd.isna(value):
        return np.nan
    match = re.search(r'\d+', str(value))
    return int(match.group()) if match else np.nan

def preprocess_property_data(prop):
    """
    Preprocess individual property data.
    """
    try:
        # Convert numeric fields
        numeric_fields = ['sale_price', 'myhome_floor_area_value', 
                          'latitude', 'longitude', 'asking_price',
                          'first_list_price']
        for field in numeric_fields:
            if field in prop:
                prop[field] = pd.to_numeric(prop[field], errors='coerce')
        
        # Extract numeric values for beds and baths
        prop['beds'] = extract_numeric(prop.get('beds'))
        prop['baths'] = extract_numeric(prop.get('baths'))
    
        # Convert date fields to datetime
        date_fields = ['sale_date', 'first_list_date']
        for field in date_fields:
            if field in prop and prop[field]:
                try:
                    prop[field] = pd.to_datetime(prop[field], errors='coerce')
                except:
                    prop[field] = pd.NaT
            else:
                prop[field] = pd.NaT
        
        # **Validate 'ber_rating' Processing**
        if 'ber_rating' in prop:
            ber = prop['ber_rating']
            logging.debug(f"Preprocessing property: BER Rating = '{ber}'")
        else:
            logging.debug("Preprocessing property: BER Rating is missing.")
        
        # **Additional Debugging: Log the entire preprocessed property**
        logging.debug(f"Preprocessed property data: {prop}")
        
        return prop
    except Exception as e:
        logging.error(f"Error in preprocess_property_data for property ID {prop.get('id', 'N/A')}: {e}")
        return prop

def fetch_nearby_properties(latitude, longitude, radius_km):
    try:
        logging.info(f"Fetching properties within {radius_km} KM of ({latitude}, {longitude})")
        
        # Calculate the approximate bounding box
        lat_range = radius_km / 111.32  # 1 degree of latitude is approximately 111.32 km
        lon_range = radius_km / (111.32 * math.cos(math.radians(latitude))) if math.cos(math.radians(latitude)) != 0 else 0
        
        min_lat = latitude - lat_range
        max_lat = latitude + lat_range
        min_lon = longitude - lon_range
        max_lon = longitude + lon_range
        
        # Query the database using the bounding box
        response = supabase.table("scraped_property_data_v2") \
            .select("*") \
            .gte("latitude", min_lat) \
            .lte("latitude", max_lat) \
            .gte("longitude", min_lon) \
            .lte("longitude", max_lon) \
            .execute()
        
        all_properties = response.data
        logging.info(f"Properties within bounding box: {len(all_properties)}")
        
        nearby_properties = []
        for prop in all_properties:
            prop_lat = prop.get('latitude')
            prop_lon = prop.get('longitude')
            if prop_lat is not None and prop_lon is not None:
                try:
                    prop_lat = float(prop_lat)
                    prop_lon = float(prop_lon)
                    distance = calculate_distance(latitude, longitude, prop_lat, prop_lon)
                    if distance is not None and distance <= radius_km:
                        nearby_properties.append(prop)
                except ValueError:
                    logging.warning(f"Invalid coordinates for property: {prop.get('id')}")
            else:
                logging.debug(f"Skipping property with missing coordinates: {prop.get('id')}")
        
        logging.info(f"Number of nearby properties found within {radius_km}km: {len(nearby_properties)}")
        return nearby_properties
    except Exception as e:
        logging.error(f"Error fetching nearby properties: {e}")
        logging.error(traceback.format_exc())
        return []

def calculate_time_based_metrics(df, days, radius):
    """
    Calculate time-based metrics for a given number of days and radius.
    """
    cutoff_date = pd.Timestamp.now() - pd.Timedelta(days=days)
    recent_df = df[df['sale_date'] >= cutoff_date]
    
    metrics = {
        f'{days}d_{radius}km_median_sold_price': recent_df['sale_price'].median(),
        f'{days}d_{radius}km_avg_asking_price': recent_df['asking_price'].mean(),
        f'{days}d_{radius}km_num_properties_sold': recent_df['sale_price'].notna().sum(),
        f'{days}d_{radius}km_avg_days_on_market': recent_df['days_on_market'].mean(),
        f'{days}d_{radius}km_median_price_per_sqm': (recent_df['price_per_square_meter']).median(),
    }
    return metrics

def calculate_nearby_metrics(nearby_props, radius):
    """
    Calculate metrics for nearby properties within a specified radius.
    """
    metrics = {}
    try:
        df = pd.DataFrame(nearby_props)
        
        if df.empty:
            logging.warning(f"No nearby properties found within {radius}km.")
            return metrics

        # Preprocess all properties
        df = df.apply(preprocess_property_data, axis=1)
        
        # Remove properties with failed preprocessing
        df = df.dropna(subset=['sale_price', 'latitude', 'longitude'])

        # Calculate metrics for different time periods
        for days in [30, 90, 180]:
            time_metrics = calculate_time_based_metrics(df, days, radius)
            metrics.update(time_metrics)
        
        # BER distribution
        df['ber_category'] = df['ber_rating'].apply(get_ber_category)
        ber_dist = df['ber_category'].value_counts(normalize=True) * 100
        for ber, percent in ber_dist.items():
            metrics[f'{radius}km_ber_dist_{ber}'] = percent
        
        # Apply get_property_type_category to categorize property types
        df['property_type_category'] = df['property_type'].apply(get_property_type_category)
        
        # Calculate distribution based on the categorized property types
        prop_type_dist = df['property_type_category'].value_counts(normalize=True) * 100
        for prop_type, percent in prop_type_dist.items():
            metrics[f'{radius}km_property_type_dist_{prop_type}'] = percent
        
        # Other general metrics
        metrics.update({
            f'{radius}km_avg_property_size': df['myhome_floor_area_value'].mean(),
            f'{radius}km_median_beds': df['beds'].median(),
            f'{radius}km_median_baths': df['baths'].median(),
            f'{radius}km_price_to_income_ratio': safe_divide(df['sale_price'].median(), 50000),  # Assuming median income of 50,000
            f'{radius}km_price_growth_rate': safe_divide(
                (df['sale_price'].mean() / df['first_list_price'].mean()) - 1, 
                1
            ) * 100 if df['first_list_price'].mean() else None,
        })
        
    except Exception as e:
        logging.error(f"Error calculating nearby metrics for radius {radius}: {str(e)}")
    return metrics

def calculate_market_trends(df):
    """
    Calculate market trends such as percent change over the last 30 days.
    """
    try:
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_sales = df[df['sale_date'] >= thirty_days_ago]
        older_sales = df[df['sale_date'] < thirty_days_ago]
        recent_avg = recent_sales['sale_price'].mean()
        older_avg = older_sales['sale_price'].mean()
        if older_avg and older_avg != 0:
            percent_change = ((recent_avg - older_avg) / older_avg) * 100
            return percent_change
        else:
            return None
    except Exception as e:
        logging.error(f"Error calculating market trends: {e}")
        return None

def calculate_price_benchmarks(df, lower_bound, upper_bound):
    """
    Calculate the ratio of average prices between two areas.
    """
    try:
        if upper_bound == 'overall':
            overall_avg = df['sale_price'].mean()
            lower_avg = df[df['sale_price'] >= lower_bound]['sale_price'].mean()
            return safe_divide(lower_avg, overall_avg)
        else:
            upper_avg = df[df['sale_price'] <= upper_bound]['sale_price'].mean()
            lower_avg = df[df['sale_price'] >= lower_bound]['sale_price'].mean()
            return safe_divide(lower_avg, upper_avg)
    except Exception as e:
        logging.error(f"Error calculating price benchmarks between {lower_bound} and {upper_bound}: {e}")
        return None

def calculate_price_trend(df, days):
    """
    Calculate the price trend over a specified number of days.
    """
    try:
        target_date = datetime.now() - timedelta(days=days)
        target_sales = df[df['sale_date'] >= target_date]
        trend = target_sales['sale_price'].mean()
        return trend
    except Exception as e:
        logging.error(f"Error calculating price trend over {days} days: {e}")
        return None

def calculate_price_per_sqm(sale_price, floor_area):
    """
    Calculate price per square meter.
    """
    if pd.notna(sale_price) and pd.notna(floor_area) and floor_area > 0:
        return sale_price / floor_area
    return None

def calculate_time_based_metrics_v2(df, days, radius):
    """
    Extended time-based metrics for compatibility with additional columns.
    """
    return calculate_time_based_metrics(df, days, radius)

# ======================================
# Step 3: Generate Columns Function
# ======================================

def generate_columns(data):
    """
    Generate all required columns/metrics for a property.
    """
    try:
        logging.info("Starting generate_columns function.")
        
        # Preprocess the property data
        preprocessed_data = preprocess_property_data(data)
        
        result = {
            'bedCategory': get_bed_category(preprocessed_data.get('beds', '0')),
            'bathCategory': get_bath_category(preprocessed_data.get('baths', '0')),
            'propertyTypeCategory': get_property_type_category(preprocessed_data.get('property_type', '')),
            'berCategory': get_ber_category(preprocessed_data.get('ber_rating', '')),
            'sizeCategory': get_size_category(preprocessed_data.get('size', 0)),  # Updated to use 'size'
            'originalInputs': {k: v for k, v in preprocessed_data.items() if k.lower() not in [
                'asking_price', 'eircode', 'local_property_tax', 'url',
                'myhome_link', 'price_per_square_meter',
                'sale_price', 'sale_date', 'first_list_price', 'first_list_date'
            ]},
            'latitude': preprocessed_data.get('latitude'),
            'longitude': preprocessed_data.get('longitude'),
            'size': preprocessed_data.get('size'),  # Updated to use 'size'
            'energy_rating_numeric': ber_to_numeric(preprocessed_data.get('ber_rating', ''))
        }
        
        # Fetch all nearby properties once
        if result['latitude'] is not None and result['longitude'] is not None:
            combined_nearby_props = []
            radii = [1, 3, 5]
            for radius in radii:
                nearby_props = fetch_nearby_properties(result['latitude'], result['longitude'], radius_km=radius)
                result[f'nearby_properties_count_within_{radius}km'] = len(nearby_props)
                if nearby_props:
                    nearby_metrics = calculate_nearby_metrics(nearby_props, radius)
                    result.update(nearby_metrics)
                    combined_nearby_props.extend(nearby_props)
                else:
                    logging.warning(f"No nearby properties found within {radius}km to calculate metrics.")
        else:
            logging.warning("Latitude or longitude is missing, skipping nearby properties calculation.")
            combined_nearby_props = []
 
        # Calculate market trends and benchmarks if combined_nearby_props is not empty
        if combined_nearby_props:
            df_nearby = pd.DataFrame(combined_nearby_props)
            # Preprocess the DataFrame
            df_nearby = df_nearby.apply(preprocess_property_data, axis=1)
            df_nearby = df_nearby.dropna(subset=['sale_price', 'latitude', 'longitude'])
 
            # Calculate market trends
            market_trend = calculate_market_trends(df_nearby)
            result['market_trend_30_days'] = market_trend
            
            # Calculate price benchmarks
            median_sale_price = df_nearby['sale_price'].median()
            result['price_benchmark_ratio_low_high'] = calculate_price_benchmarks(df_nearby, 0, median_sale_price)
            result['price_benchmark_ratio_high_overall'] = calculate_price_benchmarks(df_nearby, median_sale_price, 'overall')
            
            # Calculate price trends
            for days in [30, 90, 180]:
                trend = calculate_price_trend(df_nearby, days)
                result[f'price_trend_{days}_days'] = trend
        else:
            logging.warning("No combined nearby properties found for market trends and benchmarks.")
 
        # Replace NaN with None
        result = {k: (None if isinstance(v, float) and np.isnan(v) else v) for k, v in result.items()}
        
        logging.info("Finished generate_columns function.")
        return result
    except Exception as e:
        logging.error(f"Error in generate_columns: {str(e)}")
        return {}

# ======================================
# Step 4: Define API Endpoint
# ======================================

def python_api(request):
    try:
        logging.debug("Function started")
        request_json = request.get_json(silent=True)
        logging.debug(f"Received request: {request_json}")
        
        if request_json and 'data' in request_json:
            result = generate_columns(request_json['data'])
            return jsonify(result), 200
        else:
            return jsonify({"error": "Invalid input"}), 400
    except Exception as e:
        logging.error(f"Error in python_api: {e}")
        logging.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

# ======================================
# Step 5: Main Execution for Local Testing
# ======================================

# For local testing
if __name__ == "__main__":
    class MockRequest:
        def __init__(self, json_data):
            self.json_data = json_data
        def get_json(self, silent=False):
            return self.json_data
    
    test_data = {"data": {
        "address": "Grove Ave, Blackrock, Co. Dublin",
        "beds": "4",
        "baths": "4",
        "property_type": "House",
        "energy_rating": "B1",
        "latitude": "53.3498",
        "longitude": "-6.2603",
        "myhome_floor_area_value": 175
    }}
    mock_request = MockRequest(test_data)
    response, status = python_api(mock_request)
    print(f"Status Code: {status}")
    print("Response JSON:")
    print(json.dumps(response.json, indent=4))








