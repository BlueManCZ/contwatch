from werkzeug.routing import BaseConverter


class IntListConverter(BaseConverter):
    regex = r"\d+(?:,\d+)*,?"

    def to_python(self, value):
        return [int(x) for x in value.split(",")]

    def to_url(self, value):
        return ",".join(str(x) for x in value)
