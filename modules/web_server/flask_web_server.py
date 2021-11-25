from modules import settings
from modules.handlers import *

import modules.tools as tools

from datetime import datetime, timedelta
from flask import Flask, redirect, render_template, request
from flask_socketio import SocketIO
from os import path
from time import sleep
from threading import Thread

import platform


def parse_config(http_form, handler_class):
    config = {}

    for field in http_form:
        if field in handler_class.config_fields:
            field_type = handler_class.config_fields[field][0]
            field_data = request.form[field]
            value = field_data
            if field_type == "int":
                value = int(field_data)
            elif field_type == "float":
                value = float(field_data)
            elif field_type == "bool":
                value = bool(field_data)
            config[field] = value

    for field in handler_class.config_fields:
        if len(handler_class.config_fields[field]) > 2 and field not in config:
            config[field] = handler_class.config_fields[field][2]

        if handler_class.config_fields[field][0] == "bool":
            if field not in http_form:
                config[field] = False

    return config


class FlaskWebServer:

    def __init__(self, _manager, _database):
        self.app = Flask(__name__)
        self.host = settings.WEB_SERVER_ADDRESS
        self.port = settings.WEB_SERVER_PORT
        self.manager = _manager
        self.database = _database
        self.start_datetime = datetime.now()
        self.sio = SocketIO(self.app, async_mode="eventlet")
        self.connections = 0
        self.active = True
        self.site_config = {}  # TODO: Store JSON in file or database
        self.cache = {}

        ###########
        # SOCKETS #
        ###########

        @self.sio.on("connect")
        def connect():
            self.connections += 1
            _emit_notification("content-change-notification", "details")

        @self.sio.on("disconnect")
        def disconnect():
            self.connections -= 1
            _emit_notification("content-change-notification", "details")

        #########
        # VIEWS #
        #########

        @self.app.route("/")
        def index():
            return redirect('overview')

        @self.app.route("/index")
        def index_redirect():
            return redirect('/')

        @self.app.route("/<page_name>")
        def page(page_name):
            return render_template("layouts/default.html", manager=self.manager, page=page_name)

        @self.app.route("/overview", methods=["POST"])
        def overview():
            return render_template("pages/overview.html", manager=self.manager)

        @self.app.route("/inspector", methods=["POST"])
        def inspector():
            return render_template("pages/inspector.html", manager=self.manager, views=self.database.get_chart_views())

        @self.app.route("/handlers", methods=["POST"])
        def handlers():
            return render_template("pages/handlers.html", handlers=self.manager.get_handlers())

        @self.app.route("/data", methods=["POST"])
        def data():
            for attribute in request.json:
                self.site_config[attribute] = request.json[attribute]

            attributes = {}
            ghost_attributes = {}

            for handler_id in self.manager.registered_handlers:
                storage_attributes = self.manager.registered_handlers[handler_id].get_storage_attributes()
                labels = self.database.get_all_stored_attributes(handler_id)
                attributes[handler_id] = []
                ghost_attributes[handler_id] = []
                for attribute in labels:
                    if attribute in storage_attributes:
                        attributes[handler_id].append(attribute)
                    else:
                        ghost_attributes[handler_id].append(attribute)

            return render_template(
                "pages/data.html",
                site_config=self.site_config,
                manager=self.manager,
                attributes=attributes,
                ghost_attributes=ghost_attributes
            )

        @self.app.route("/details", methods=["POST"])
        def details():
            dictionary = {
                "node": platform.node(),
                "release": platform.release(),
                "machine": platform.machine(),
                "architecture": platform.architecture(),
                "processor": tools.cpu_model(),
                "uptime": int((datetime.now() - self.start_datetime).total_seconds()),
                "handlers": len(self.manager.get_handlers()),
                "connections": self.connections,
                "database_size": path.getsize(settings.DATABASE_FILE),
                "cache_size": tools.get_size(self.cache),
                "python_version": platform.python_version(),
                "distribution": tools.distribution()
            }
            return render_template("pages/details.html", data=dictionary)

        #######
        # API #
        #######

        def json_error(error, message):
            response = {
                "error": error,
                "message": message
            }
            return response, error

        @self.app.route("/api")
        def api():
            return "Specify your API request"

        def parse_query(query):
            query = query.split(",")
            data_map = {}
            for entry in query:
                specifier = entry.split("-")
                d_id = int(specifier[0])
                if len(specifier) == 2:
                    if d_id not in data_map:
                        data_map[d_id] = []
                    data_map[d_id].append(specifier[1])
                else:
                    data_map[d_id] = []
            return data_map

        def build_chart_data(data_map, datetime_from, datetime_to, smartround):
            response = {}
            for handler_id in data_map:
                attributes = data_map[handler_id] if data_map[handler_id] \
                    else self.database.get_all_stored_attributes(handler_id)

                chart_data = {}

                for attribute in attributes:
                    chart_data[attribute] = {"timestamps": [], "values": []}
                    result = self.database.get_handler_attribute_data(handler_id, attribute, datetime_from, datetime_to,
                                                                      smartround=smartround)
                    for entry in result:
                        entry_time = entry[0]
                        chart_data[attribute]["timestamps"].append(int(entry_time.timestamp()))
                        chart_data[attribute]["values"].append(entry[1])

                    response[handler_id] = chart_data
            return response

        @self.app.route("/api/charts")
        def api_charts():
            handler_id = request.args["handler_id"] if "handler_id" in request.args else ""
            raw_query = request.args["query"] if "query" in request.args else ""
            date_from = request.args["date_from"] if "date_from" in request.args else ""
            date_to = request.args["date_to"] if "date_to" in request.args else ""
            smartround = request.args["smartround"] if "smartround" in request.args else 0
            cache = request.args["cache"] if "cache" in request.args else False

            datetime_from = datetime.min
            datetime_to = datetime.now()

            data_map = {}

            if handler_id:
                try:
                    handler_id = int(handler_id)
                    data_map[handler_id] = []
                except Exception as e:
                    print(e)
                    return json_error(400, "Argument 'handler_id' has to be an integer.")
            elif raw_query:
                try:
                    data_map = parse_query(raw_query)
                except Exception as e:
                    print(e)
                    return json_error(400, "Argument 'query' cannot be successfully parsed")
            else:
                return json_error(400, "Either 'handler_id' or 'query' has to be provided as an argument.")

            if date_from:
                try:
                    datetime_from = datetime.strptime(date_from, "%d-%m-%Y")
                except Exception as e:
                    print(e)
                    return json_error(400, "Argument 'date_from' is not in '%d-%m-%Y' format.")

            if date_to:
                try:
                    datetime_to = datetime.strptime(date_to, "%d-%m-%Y")
                    datetime_to += timedelta(days=1)
                except Exception as e:
                    print(e)
                    return json_error(400, "Argument 'date_to' is not in '%d-%m-%Y' format.")

            if smartround:
                try:
                    smartround = int(smartround)
                except Exception as e:
                    print(e)
                    return json_error(400, "Argument 'smartround' has to be an integer.")

            if settings.CACHING_INTERVAL and cache:
                if raw_query in self.cache:
                    for entry in self.cache[raw_query]:
                        if entry["s"] == smartround and entry["f"] == datetime_from:
                            delta = datetime.now() - entry["c"]
                            if settings.CACHING_ASYNC:
                                print("Returning from async cache")
                                return entry["r"]
                            if delta.total_seconds() / 60 < settings.CACHING_INTERVAL:
                                print("Returning from cache")
                                return entry["r"]

            response = build_chart_data(data_map, datetime_from, datetime_to, smartround)

            if settings.CACHING_INTERVAL and cache:
                if raw_query not in self.cache:
                    self.cache[raw_query] = []
                self.cache[raw_query].append({
                    "c": datetime.now(),
                    "r": response,
                    "f": datetime_from,
                    "t": datetime_to,
                    "s": smartround
                })
                print("Saving to cache")

            return response

        #########
        # FORMS #
        #########

        @self.app.route("/dialog/<dialog_name>", methods=["POST"])
        def dialog(dialog_name):
            if "add_new_handler" in dialog_name:
                handler_type = dialog_name.split("_")[-1]
                for handler in loaded_handlers:
                    if handler.type == handler_type:
                        fields = handler.config_fields
                        return render_template("dialogs/add_new_handler.html", fields=fields, handler_type=handler_type)

            if "edit_handler" in dialog_name:
                handler_id = int(dialog_name.split("_")[-1])
                handler = self.manager.get_handler(handler_id)
                return render_template("dialogs/edit_handler.html", id=handler_id, handler=handler)

            if "json_attributes_to_store" in dialog_name:
                handler_id = int(dialog_name.split("_")[-1])
                handler = self.manager.get_handler(handler_id)
                json = self.manager.last_messages[handler_id]
                return render_template(
                    "dialogs/json_attributes_to_store.html",
                    id=handler_id,
                    handler=handler,
                    json=json[1]
                )

            template_name = f"dialogs/{dialog_name}.html"
            return render_template(template_name, loaded_handlers=loaded_handlers)

        @self.app.route("/add_new_handler", methods=["POST"])
        def add_new_handler():
            handler_class = get_handler_class(request.form["__handler_type__"])
            handler_label = request.form["__handler_label__"]
            config = parse_config(request.form, handler_class)
            handler_settings = {"configuration": config}
            new_handler = handler_class(handler_settings)
            new_handler.set_label(handler_label)
            database_handler = self.database.add_handler(new_handler)
            self.manager.register_handler(database_handler.id, new_handler)
            return "ok"

        @self.app.route("/edit_handler/<int:handler_id>", methods=["POST"])
        def edit_handler(handler_id):
            handler_class = get_handler_class(request.form["__handler_type__"])
            handler_label = request.form["__handler_label__"]
            config = parse_config(request.form, handler_class)
            handler = self.manager.get_handler(handler_id)
            handler.update_config(config)
            handler.set_label(handler_label)
            self.database.update_handler_settings(handler_id, handler.settings)
            self.manager.add_changed("handlers")
            return "ok"

        @self.app.route("/delete_handler/<int:handler_id>", methods=["POST"])
        def delete_handler(handler_id):
            self.database.delete_handler(handler_id)
            handler = self.manager.get_handler(handler_id)
            handler.exit()
            self.manager.delete_handler(handler_id)
            return "ok"

        @self.app.route("/edit_json_attributes_to_store/<int:handler_id>", methods=["POST"])
        def edit_json_attributes_to_store(handler_id):
            handler = self.manager.get_handler(handler_id)
            handler.clear_storage_attributes()
            for attribute in request.form:
                handler.add_storage_attribute(attribute)
            self.database.update_handler_settings(handler_id, handler.settings)
            self.manager.add_changed("data")
            return "ok"

        @self.app.route("/save_or_edit_chart_view", methods=["POST"])
        def save_or_edit_chart_view():
            view_id = request.json["view_id"]
            if not request.json["label"]:
                return {"status": False, "error": "View label cannot be empty"}
            if view_id >= 0:
                self.database.update_chart_view(view_id, request.json["label"], request.json["settings"])
            else:
                view_id = self.database.add_chart_view(request.json["label"], request.json["settings"]).id
            self.manager.add_changed("inspector")
            return {"status": True, "view_id": view_id}

        @self.app.route("/delete_chart_view/<int:view_id>", methods=["POST"])
        def delete_chart_view(view_id):
            self.database.delete_chart_view(view_id)
            self.manager.add_changed("inspector")
            return {"status": True, "view_id": view_id}

        #################
        # JINJA FILTERS #
        #################

        @self.app.template_filter("generate_handler_name")
        def generate_handler_name(handler):
            label = handler.get_label()
            return label if label else handler.type + " handler_id"

        @self.app.template_filter("hr_filesize")
        def hr_filesize(filesize):
            units = ["B", "kB", "MB", "GB", "TB"]
            i = 0
            while filesize > 100:
                filesize /= 1000
                i += 1
            value = f"{filesize:.2f}".rstrip("0").rstrip(".")
            return f"{value} {units[i]}"

        @self.app.template_filter("hr_datetime")
        def hr_datetime(seconds):
            time_data = {}
            time_data["day"], remaining = divmod(seconds, 86_400)
            time_data["hour"], remaining = divmod(remaining, 3_600)
            time_data["minute"], time_data["second"] = divmod(remaining, 60)

            time_parts = []

            for name, value in time_data.items():
                if value > 0:
                    time_parts.append(f"{round(value)} {name}{'s' if value > 1 else ''}")

            if time_parts:
                return " ".join(time_parts[:2])
            else:
                return "below 1 second"

        #########
        # OTHER #
        #########

        def _emit_notification(notification_type, value):
            self.sio.emit(notification_type, value, namespace='/')

        def content_change_watcher():
            while self.active:
                if self.connections > 0:
                    pages = []
                    for handler in self.manager.get_handlers().values():
                        while handler.changed:
                            page_name = handler.changed.pop()
                            if page_name not in pages:
                                pages.append(page_name)

                    while self.manager.changed:
                        page_name = self.manager.changed.pop()
                        if page_name not in pages:
                            pages.append(page_name)

                    for page_name in pages:
                        _emit_notification("content-change-notification", page_name)

                sleep(0.1)

        def cache_refresher():
            while self.active:
                now = datetime.now()
                for query in self.cache:
                    for entry in self.cache[query]:
                        if entry["t"].day == now.day and entry["t"].month == now.month and entry["t"].year == now.year:
                            entry["r"] = build_chart_data(parse_query(query), entry["f"], now, entry["s"])
                            print("Rebuilding cache")
                        else:
                            self.cache[query].remove(entry)
                sleep(settings.CACHING_INTERVAL * 60)

        Thread(target=content_change_watcher).start()

        refresher = Thread(target=cache_refresher)
        refresher.daemon = True
        refresher.start()

        self.serverThread = Thread(target=self.run)
        self.serverThread.start()

    def run(self):
        self.sio.run(self.app, self.host, self.port, debug=settings.WEB_SERVER_DEBUG, use_reloader=False)

    def exit(self):
        self.active = False
