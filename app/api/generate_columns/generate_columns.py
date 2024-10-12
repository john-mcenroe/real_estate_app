import sys
import json
import logging
import os
import traceback

logging.basicConfig(level=logging.DEBUG, filename='generate_columns.log', filemode='w')

DEBUG = os.environ.get('DEBUG_MODE') == 'true'

def calculate_property_age(year_built):
    current_year = 2023  # You might want to dynamically calculate this
    return current_year - year_built if year_built else None

def calculate_price_per_sqm(price, size):
    return price / size if size else None

def calculate_log_price(price):
    return math.log(price) if price > 0 else None

def get_property_type_category(property_type):
    if property_type.lower() in ['apartment', 'flat', 'studio']:
        return 'Apartment'
    elif property_type.lower() in ['house', 'bungalow', 'cottage', 'villa']:
        return 'House'
    else:
        return 'Other'

def get_bed_category(beds):
    try:
        beds = int(beds)
    except ValueError:
        return "Unknown"
    if beds <= 1:
        return "Studio/1 Bed"
    elif beds <= 2:
        return "2 Bed"
    elif beds <= 3:
        return "3 Bed"
    else:
        return "4+ Bed"

def get_bath_category(baths):
    try:
        baths = int(baths)
    except ValueError:
        return "Unknown"
    if baths <= 1:
        return "1 Bath"
    elif baths <= 2:
        return "2 Bath"
    else:
        return "3+ Bath"

def get_size_category(size):
    try:
        size = float(size)
    except ValueError:
        return "Unknown"
    if size < 50:
        return "Very Small"
    elif size < 90:
        return "Small"
    elif size < 130:
        return "Medium"
    elif size < 200:
        return "Large"
    else:
        return "Very Large"

def get_ber_category(ber_rating):
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

def generate_columns(data):
    try:
        result = {
            'bedCategory': get_bed_category(data.get('beds', 0)),
            'bathCategory': get_bath_category(data.get('baths', 0)),
            'sizeCategory': get_size_category(data.get('size', 0)),
            'propertyTypeCategory': get_property_type_category(data.get('property_type', '')),
            'berCategory': get_ber_category(data.get('ber_rating', '')),
            'originalInputs': data  # Include original inputs for debugging
        }
        logging.debug(f"Generated result: {result}")
        return result
    except Exception as e:
        logging.error(f"Error in generate_columns: {str(e)}")
        return {"error": str(e)}

if __name__ == "__main__":
    try:
        logging.debug(f"Script started with arguments: {sys.argv}")
        if len(sys.argv) > 1:
            input_json = sys.argv[1]
        else:
            input_json = sys.stdin.read()
        
        logging.debug(f"Received input: {input_json}")
        input_data = json.loads(input_json)
        
        result = generate_columns(input_data)
        print(json.dumps(result))
    except json.JSONDecodeError as e:
        logging.error(f"JSON decode error: {str(e)}")
        print(json.dumps({"error": "Invalid JSON input", "details": str(e)}))
    except Exception as e:
        logging.error(f"Error in main: {str(e)}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        print(json.dumps({"error": str(e), "traceback": traceback.format_exc()}))
