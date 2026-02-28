from pony import orm

db = orm.Database()


def init_database(db_config: dict):
    """Initializes database"""
    provider = db_config.get("provider")
    if provider == "postgres":
        db.bind(
            provider=provider,
            user=db_config.get("user", "contwatch"),
            password=db_config.get("password", "contwatch"),
            host=db_config.get("host", "localhost"),
            database=db_config.get("database", "contwatch"),
        )
    elif provider == "sqlite" or provider is None:
        db.bind(provider="sqlite", filename=db_config.get("filename", "database.sqlite"), create_db=True)

    db.generate_mapping(create_tables=True)
