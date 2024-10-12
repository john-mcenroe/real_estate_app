import json
import math

def calculate_property_age(year_built):
    current_year = 2023  # You might want to dynamically calculate this
    return current_year - year_built if year_built else None

def calculate_price_per_sqm(price, size):
    return price / size if size else None

def calculate_log_price(price):
    return math.log(price) if price > 0 else None

def get_property_type_category(property_type):
    apartment_keywords = ['apartment', 'flat', 'studio']
    house_keywords = ['house', 'bungalow', 'cottage', 'villa']
    
    if any(keyword in property_type.lower() for keyword in apartment_keywords):
        return 'Apartment'
    elif any(keyword in property_type.lower() for keyword in house_keywords):
        return 'House'
    else:
        return 'Other'

def get_bed_category(beds):
    if beds <= 1:
        return "Studio/1 Bed"
    elif beds <= 2:
        return "2 Bed"
    elif beds <= 3:
        return "3 Bed"
    else:
        return "4+ Bed"

def get_bath_category(baths):
    if baths <= 1:
        return "1 Bath"
    elif baths <= 2:
        return "2 Bath"
    else:
        return "3+ Bath"

def get_size_category(size):
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

def handler(request):
    if request.method == 'OPTIONS':
        # Handle CORS preflight request
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',  # Adjust this for production
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            'body': ''
        }

    if request.method == 'POST':
        try:
            body = request.json

            # Extract inputs with default values if not provided
            beds = int(body.get('beds', 1))
            baths = int(body.get('baths', 1))
            size = float(body.get('size', 30))
            year_built = int(body.get('year_built')) if body.get('year_built') not in (None, '') else None
            price = float(body.get('price', 0))
            property_type = body.get('property_type', '')
            ber_rating = body.get('ber_rating', '')

            # Calculate additional columns
            result = {
                **body,
                'bedCategory': get_bed_category(beds),
                'bathCategory': get_bath_category(baths),
                'sizeCategory': get_size_category(size),
                'propertyAge': calculate_property_age(year_built),
                'pricePerSqm': calculate_price_per_sqm(price, size),
                'logPrice': calculate_log_price(price),
                'propertyTypeCategory': get_property_type_category(property_type),
                'berCategory': get_ber_category(ber_rating)
            }

            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'  # Adjust this for production
                },
                'body': json.dumps(result)
            }

        except Exception as e:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'  # Adjust this for production
                },
                'body': json.dumps({'error': str(e)})
            }

    # If not POST or OPTIONS, return 405 Method Not Allowed
    return {
        'statusCode': 405,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'  # Adjust this for production
        },
        'body': json.dumps({'error': 'Method Not Allowed'})
    }
