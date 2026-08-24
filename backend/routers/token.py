import jwt
from datetime import datetime, timedelta

SECRET_KEY = "fmcg_software_c-met"

payload = {
    "exp": datetime.utcnow() + timedelta(hours=24)
}

token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")

print("Token:")
print(token)