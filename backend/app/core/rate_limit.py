from slowapi import Limiter
from slowapi.util import get_remote_address

# Initialize Limiter
# Rate limit keys are based on remote IP Address
limiter = Limiter(key_func=get_remote_address)
