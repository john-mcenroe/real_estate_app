import functions_framework
from flask import jsonify
import sklearn
import xgboost
import pandas
import numpy

@functions_framework.http
def check_versions(request):
    versions = {
        "scikit-learn": sklearn.__version__,
        "XGBoost": xgboost.__version__,
        "pandas": pandas.__version__,
        "numpy": numpy.__version__
    }
    return jsonify(versions)

