from datetime import datetime

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
        print("Time of request:\t", datetime.now().time())
        charts_data = []

        date = datetime.fromisoformat(date).date() if date else datetime.now().date()

        for attribute_id in attribute_ids:
            data_units = DataUnit.select(
                lambda data_unit: data_unit.attribute.id == attribute_id and data_unit.date == date
            )

            print("Time of query:\t\t", datetime.now().time())

            if not data_units:
                continue

            first_data_unit = data_units.first()
            attr = first_data_unit.attribute

            charts_data.append(
                {
                    "id": attribute_id,
                    "label": attr.label or attr.name,
                    "unit": attr.unit,
                    "color": attr.color,
                    "data": [
                        {
                            "x": datetime.fromisoformat(f"{data_unit.date} {data_unit.time[:8]}").timestamp(),
                            "y": data_unit.value,
                        }
                        for data_unit in data_units
                    ],
                }
            )

            print("Time of processing:\t", datetime.now().time())

        # Return charts data for Chart.js
        return charts_data

    return blueprint
