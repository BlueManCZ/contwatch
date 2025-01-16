from datetime import datetime, time

from flask import Blueprint
from pony import orm

from modules.models.data_unit import DataUnit
from modules.utils import Context, this_name


def charts_blueprint(_context: Context):
    blueprint = Blueprint(this_name(), __name__)

    @blueprint.route("/attribute", defaults={"attribute_ids": [], "date": None})
    @blueprint.route("/attribute/<int_list:attribute_ids>/", defaults={"date": None})
    @blueprint.route("/attribute/<int_list:attribute_ids>/<string:date>")
    @orm.db_session
    def attribute(attribute_ids, date):
        charts_data = []

        date = datetime.fromisoformat(date).date() if date else datetime.now().date()

        for attribute_id in attribute_ids:
            data_units = DataUnit.select(
                lambda data_unit: data_unit.attribute.id == attribute_id and data_unit.date == date
            )

            if not data_units:
                continue

            charts_data.append(
                {
                    "id": attribute_id,
                    "label": data_units.first().attribute.label or data_units.first().attribute.name,
                    "color": data_units.first().attribute.color,
                    "data": [
                        {
                            "x": int(
                                datetime.combine(data_unit.date, time.fromisoformat(str(data_unit.time))).timestamp()
                            ),
                            "y": data_unit.value,
                        }
                        for data_unit in data_units
                    ],
                }
            )

        # Return charts data for Chart.js
        return charts_data

    return blueprint
