import datetime
from datetime import datetime

from flask import Blueprint, request
from pony import orm

from modules.models.data_stat import DataStat
from modules.utils import Context, this_name, StatusCode


def datastats_blueprint(_context: Context):
    blueprint = Blueprint(this_name(), __name__)

    def data_stat_serializer(data_stat):
        return {
            "id": data_stat.id,
            "attribute": data_stat.attribute.id,
            "type": data_stat.type,
            "value": data_stat.value,
            "date": data_stat.date,
            "time": str(data_stat.time),
        }

    @blueprint.route("/")
    @orm.db_session
    def get_datastats():
        attribute_id = int(request.args.get("attribute"))
        if attribute_id:
            return [
                data_stat_serializer(data_stat)
                for data_stat in (
                    DataStat.select(lambda d: d.attribute.id == attribute_id and d.date == datetime.now().date())
                )
            ], StatusCode.OK
        return [
            data_stat_serializer(data_stat)
            for data_stat in (DataStat.select(lambda d: d.date == datetime.now().date()))
        ], StatusCode.OK

    return blueprint
