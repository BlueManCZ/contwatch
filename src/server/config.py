# from os import environ


class ApplicationConfig:
    """Class for application configuration"""

    # SECRET_KEY = environ.get("SECRET_KEY")
    SECRET_KEY = "asdfasfasdf4564asdf"
    SESSION_TYPE = "redis"
    SESSION_PERMANENT = False
    SESSION_USE_SIGNER = True
    # SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_SAMESITE = "Lax"
    JSON_SORT_KEYS = False
