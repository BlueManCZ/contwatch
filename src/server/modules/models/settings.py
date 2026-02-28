from pony import orm

from modules.database import db


class Settings(db.Entity):
    """Database entity representing settings"""

    user = orm.Required(int, index=True)
    actions_node_map = orm.Optional(orm.Json)


def get_settings(user_id: int) -> Settings:
    """Returns settings for user"""
    return Settings.get(user=user_id)


def set_settings(user_id: int, actions_node_map: dict) -> Settings:
    """Sets settings for user"""
    settings = Settings.get(user=user_id)
    if settings is None:
        settings = Settings(user=user_id, actions_node_map=actions_node_map)
    else:
        settings.actions_node_map = actions_node_map
    return settings
