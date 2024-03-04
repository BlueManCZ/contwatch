from pony import orm

db = orm.Database()


def init_database():
    """Initializes database"""
    db.bind(provider="sqlite", filename="database.sqlite", create_db=True)
    db.generate_mapping(create_tables=True)
