from .actions import actions_blueprint
from .attributes import attributes_blueprint
from .charts import charts_blueprint
from .handlers import handlers_blueprint
from .widgets import widgets_blueprint

blueprints = {
    "actions": actions_blueprint,
    "attributes": attributes_blueprint,
    "charts": charts_blueprint,
    "handlers": handlers_blueprint,
    "widgets": widgets_blueprint,
}
