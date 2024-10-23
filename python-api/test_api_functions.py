import json
from generate_columns import generate_columns
from predict import predict

def test_generate_columns():
    print("\nTesting generate_columns function:")
    # Test input data
    test_data = {
        "address": "Grove Ave, Blackrock, Co. Dublin",
        "beds": "4",
        "baths": "4",
        "property_type": "House",
        "energy_rating": "B1",
        "latitude": "53.3498",
        "longitude": "-6.2603",
        "myhome_floor_area_value": 175
    }

    # Run generate_columns function
    result = generate_columns(test_data)

    # Print the result
    print(json.dumps(result, indent=2))

    # Basic assertions
    assert isinstance(result, dict), "Result should be a dictionary"
    assert 'bedCategory' in result, "Result should contain 'bedCategory'"
    assert 'bathCategory' in result, "Result should contain 'bathCategory'"
    assert 'propertyTypeCategory' in result, "Result should contain 'propertyTypeCategory'"
    assert 'berCategory' in result, "Result should contain 'berCategory'"

    print("All basic assertions for generate_columns passed.")

def test_predict():
    print("\nTesting predict function:")
    # Test input data (using the output from generate_columns)
    test_data = generate_columns({
        "address": "Grove Ave, Blackrock, Co. Dublin",
        "beds": "4",
        "baths": "4",
        "property_type": "House",
        "energy_rating": "B1",
        "latitude": "53.3498",
        "longitude": "-6.2603",
        "myhome_floor_area_value": 175
    })

    # Add originalInputs to match the expected input format
    test_data['originalInputs'] = {
        "beds": "4",
        "baths": "4",
        "size": "175",
        "latitude": "53.3498",
        "longitude": "-6.2603",
        "property_type": "House",
        "ber_rating": "B1"
    }

    # Run predict function
    result = predict(test_data)

    # Print the result
    print(json.dumps(result, indent=2))

    # Basic assertions
    assert isinstance(result, dict), "Result should be a dictionary"
    assert 'prediction' in result or 'error' in result, "Result should contain 'prediction' or 'error'"

    print("All basic assertions for predict passed.")

if __name__ == "__main__":
    test_generate_columns()
    test_predict()
