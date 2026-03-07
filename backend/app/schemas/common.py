from pydantic import ConfigDict


class OrmBase:
    model_config = ConfigDict(from_attributes=True)
