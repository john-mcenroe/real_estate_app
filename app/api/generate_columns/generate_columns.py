import sys
import json
import logging
import os
import traceback
import math
from dotenv import load_dotenv
from supabase import create_client, Client
from statistics import median

# Load environment variables from .env.local
load_dotenv(".env.local")

# Configure logging to stderr
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    stream=sys.stderr
)

# Fetch Supabase credentials from environment variables
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    logging.error("Supabase credentials are missing in the environment variables.")
    print(json.dumps({"error": "Supabase credentials are missing in the environment variables."}))
    sys.exit(1)

# Initialize Supabase client
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    logging.info("Successfully connected to Supabase.")
except Exception as e:
    logging.error(f"Failed to connect to Supabase: {e}")
    print(json.dumps({"error": "Failed to connect to Supabase."}))
    sys.exit(1)

def get_property_type_category(property_type):
    if not property_type:
        return 'Unknown'
    if property_type.lower() in ['apartment', 'flat', 'studio']:
        return 'Apartment'
    elif property_type.lower() in ['house', 'bungalow', 'cottage', 'villa', 'townhouse']:
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
    try:
        baths = int(baths)
    except (ValueError, TypeError):
        logging.warning(f"Invalid bath count: {baths}")
        return "Unknown"
    if baths <= 1:
        return "1 Bath"
    elif baths == 2:
        return "2 Bath"
    else:
        return "3+ Bath"

def get_ber_category(ber_rating):
    if not ber_rating:
        return 'Unknown'
    if ber_rating in ['A1', 'A2', 'A3']:
        return 'A'
    elif ber_rating in ['B1', 'B2', 'B3']:
        return 'B'
    elif ber_rating in ['C1', 'C2', 'C3']:
        return 'C'
    elif ber_rating in ['D1', 'D2']:
        return 'D'
    elif ber_rating in ['E1', 'E2']:
        return 'E'
    elif ber_rating == 'F':
        return 'F'
    elif ber_rating == 'G':
        return 'G'
    else:
        return 'Unknown'

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
    R = 6371  # Radius of the Earth in kilometers
    
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    distance = R * c
    return distance

def fetch_nearby_properties(latitude, longitude, radius_km=5):
    try:
        logging.info(f"Fetching properties within {radius_km} KM of ({latitude}, {longitude})")
        
        # Calculate the approximate bounding box
        lat_range = radius_km / 111.32  # 1 degree of latitude is approximately 111.32 km
        lon_range = radius_km / (111.32 * math.cos(math.radians(latitude)))
        
        min_lat = latitude - lat_range
        max_lat = latitude + lat_range
        min_lon = longitude - lon_range
        max_lon = longitude + lon_range
        
        # Query the database using the bounding box
        response = supabase.table("scraped_property_data_v1") \
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
                    if distance <= radius_km:
                        nearby_properties.append(prop)
                except ValueError:
                    logging.warning(f"Invalid coordinates for property: {prop.get('id')}")
            else:
                logging.debug(f"Skipping property with missing coordinates: {prop.get('id')}")
        
        logging.info(f"Number of nearby properties found: {len(nearby_properties)}")
        return nearby_properties
    except Exception as e:
        logging.error(f"Error fetching nearby properties: {e}")
        logging.error(traceback.format_exc())
        return []

def calculate_nearby_metrics(nearby_properties):
    """
    Calculate metrics based on nearby properties.
    """
    metrics = {}
    try:
        if not nearby_properties:
            logging.warning("No nearby properties found within the specified radius.")
            return metrics

        # Extract relevant data
        sold_prices = [prop['Sale_Price'] for prop in nearby_properties if prop.get('Sale_Price') is not None]
        ber_ratings = [prop['Energy_Rating'] for prop in nearby_properties if prop.get('Energy_Rating')]
        property_types = [prop['Property_Type'] for prop in nearby_properties if prop.get('Property_Type')]

        logging.debug(f"Number of sold prices: {len(sold_prices)}")
        logging.debug(f"Number of BER ratings: {len(ber_ratings)}")
        logging.debug(f"Number of property types: {len(property_types)}")

        # Calculate Average Sold Price
        if sold_prices:
            avg_sold_price = sum(sold_prices) / len(sold_prices)
            metrics['nearby_avg_sold_price'] = round(avg_sold_price, 2)
            logging.debug(f"Calculated nearby_avg_sold_price: {metrics['nearby_avg_sold_price']}")
        else:
            metrics['nearby_avg_sold_price'] = None
            logging.debug("No valid sold prices found to calculate average.")

        # Calculate Median Sold Price
        if sold_prices:
            median_sold_price = median(sold_prices)
            metrics['nearby_median_sold_price'] = round(median_sold_price, 2)
            logging.debug(f"Calculated nearby_median_sold_price: {metrics['nearby_median_sold_price']}")
        else:
            metrics['nearby_median_sold_price'] = None
            logging.debug("No valid sold prices found to calculate median.")

        # Calculate BER Category A Percentage
        if ber_ratings:
            ber_A_count = ber_ratings.count('A')
            ber_A_percent = (ber_A_count / len(ber_ratings)) * 100
            metrics['nearby_ber_A_percent'] = round(ber_A_percent, 2)
            logging.debug(f"Calculated nearby_ber_A_percent: {metrics['nearby_ber_A_percent']}")
        else:
            metrics['nearby_ber_A_percent'] = None
            logging.debug("No BER ratings found to calculate BER Category A percentage.")

        # Calculate Property Type Townhouse Percentage
        if property_types:
            townhouse_count = sum(1 for pt in property_types if pt.lower() == 'townhouse')
            townhouse_percent = (townhouse_count / len(property_types)) * 100
            metrics['nearby_property_type_townhouse_percent'] = round(townhouse_percent, 2)
            logging.debug(f"Calculated nearby_property_type_townhouse_percent: {metrics['nearby_property_type_townhouse_percent']}")
        else:
            metrics['nearby_property_type_townhouse_percent'] = None
            logging.debug("No property types found to calculate townhouse percentage.")

    except Exception as e:
        logging.error(f"Error calculating nearby metrics: {e}")
        logging.error(traceback.format_exc())

    return metrics

def generate_columns(data):
    try:
        logging.info("Starting generate_columns function.")
        logging.debug(f"Input data: {data}")

        # Drop unnecessary input fields
        data = {k: v for k, v in data.items() if k.lower() not in [
            'asking_price', 'eircode', 'local_property_tax', 'url',
            'myhome_floor_area_value', 'myhome_link', 'price_per_square_meter',
            'sale_price', 'sale_date', 'first_list_price', 'first_list_date'
        ]}
        logging.debug(f"Filtered input data: {data}")

        # Explicitly list input columns
        address = data.get('address', '')
        beds = data.get('beds', '0')
        baths = data.get('baths', '0')
        property_type = data.get('property_type', '')
        energy_rating = data.get('energy_rating', '')
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        logging.info(f"Input property coordinates: Lat {latitude}, Long {longitude}")

        # Validate essential fields
        if latitude is None or longitude is None:
            logging.warning("Latitude or Longitude is missing in the input data.")

        # Generate initial derived categories
        result = {
            'bedCategory': get_bed_category(beds),
            'bathCategory': get_bath_category(baths),
            'propertyTypeCategory': get_property_type_category(property_type),
            'berCategory': get_ber_category(energy_rating),
            'originalInputs': data,  # Include original inputs for debugging
            'latitude': latitude,
            'longitude': longitude,
        }
        logging.debug(f"Initial derived categories: {result}")

        # Fetch nearby properties (e.g., within 5 KM)
        if latitude is not None and longitude is not None:
            try:
                latitude = float(latitude)
                longitude = float(longitude)
                nearby_props = fetch_nearby_properties(latitude, longitude, radius_km=5)
                logging.info(f"Number of nearby properties found: {len(nearby_props)}")
                if nearby_props:
                    logging.debug(f"First 5 nearby properties: {nearby_props[:5]}")
                    nearby_metrics = calculate_nearby_metrics(nearby_props)
                    logging.debug(f"Nearby metrics: {nearby_metrics}")
                    result.update(nearby_metrics)
                else:
                    logging.warning("No nearby properties found to calculate metrics.")
                result['nearby_properties_count'] = len(nearby_props)
            except ValueError:
                logging.error(f"Invalid latitude or longitude: {latitude}, {longitude}")
                result['nearby_properties_count'] = 0
        else:
            logging.warning("Latitude or longitude is missing, skipping nearby properties calculation.")
            result['nearby_properties_count'] = 0

        logging.info("Finished generate_columns function.")
        logging.debug(f"Generated result: {result}")
        return result
    except Exception as e:
        logging.error(f"Error in generate_columns: {str(e)}")
        logging.error(traceback.format_exc())
        raise

def main():
    try:
        logging.debug("Python script started")
        logging.debug(f"Current working directory: {os.getcwd()}")

        # Read JSON data from stdin
        input_data = sys.stdin.read()
        if not input_data:
            logging.error("No input JSON provided via stdin")
            print(json.dumps({"error": "No input data provided"}))
            sys.exit(1)

        logging.debug(f"Received JSON input: {input_data}")

        try:
            input_json = json.loads(input_data)
            logging.debug(f"Parsed input JSON: {input_json}")
        except json.JSONDecodeError as e:
            logging.error(f"Error decoding JSON input: {str(e)}")
            print(json.dumps({"error": f"Invalid JSON input: {str(e)}"}))
            sys.exit(1)

        # Generate columns based on input data
        result = generate_columns(input_json)

        # Output the result as JSON
        output_json = json.dumps(result)
        logging.debug(f"Output JSON: {output_json}")
        print(output_json)

    except Exception as e:
        logging.error(f"Error in main execution: {str(e)}")
        logging.error(traceback.format_exc())
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()