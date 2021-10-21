import platform
import time

from modules.devices import *

from datetime import datetime, timedelta
from flask import Flask, redirect, render_template, request
from flask_socketio import SocketIO
from threading import Thread
# from waitress import serve


def parse_config(http_form, device_class):
    config = {}

    for field in http_form:
        if field in device_class.config_fields:
            field_type = device_class.config_fields[field][0]
            field_data = request.form[field]
            value = field_data
            if field_type == "int":
                value = int(field_data)
            elif field_type == "float":
                value = float(field_data)
            elif field_type == "bool":
                value = bool(field_data)
            config[field] = value

    for field in device_class.config_fields:
        if len(device_class.config_fields[field]) > 2 and field not in config:
            config[field] = device_class.config_fields[field][2]

        if device_class.config_fields[field][0] == "bool":
            if field not in http_form:
                config[field] = False

    return config


class FlaskWebServer:

    def __init__(self, _host, _port, _manager, _database):
        self.app = Flask(__name__)
        self.host = _host
        self.port = _port
        self.manager = _manager
        self.database = _database
        self.start_time = time.time()
        self.sio = SocketIO(self.app)
        self.connections = 0
        self.active = True
        self.site_config = {}  # TODO: Store JSON in file or database

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
            return render_template("pages/inspector.html", manager=self.manager)

        @self.app.route("/devices", methods=["POST"])
        def devices():
            return render_template("pages/devices.html", devices=self.manager.get_devices())

        @self.app.route("/data", methods=["POST"])
        def data():
            for attribute in request.json:
                self.site_config[attribute] = request.json[attribute]

            attributes = {}
            ghost_attributes = {}

            for device_id in self.manager.registered_devices:
                storage_attributes = self.manager.registered_devices[device_id].get_storage_attributes()
                labels = self.database.get_all_stored_attributes(device_id)
                attributes[device_id] = []
                ghost_attributes[device_id] = []
                for attribute in labels:
                    if attribute in storage_attributes:
                        attributes[device_id].append(attribute)
                    else:
                        ghost_attributes[device_id].append(attribute)

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
                "processor": platform.processor(),
                "uptime": time.strftime('%H:%M:%S', time.gmtime(time.time() - self.start_time)),
                "devices": len(self.manager.get_devices()),
                "connections": self.connections
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

        @self.app.route("/api/charts")
        def api_charts():
            device_id = request.args["device_id"] if "device_id" in request.args else ""
            query = request.args["query"] if "query" in request.args else ""
            date_from = request.args["date_from"] if "date_from" in request.args else ""
            date_to = request.args["date_to"] if "date_to" in request.args else ""
            smartround = request.args["smartround"] if "smartround" in request.args else 0

            datetime_from = datetime.min
            datetime_to = datetime.now()

            data_map = {}

            if device_id:
                try:
                    device_id = int(device_id)
                    data_map[device_id] = []
                except Exception as e:
                    print(e)
                    return json_error(400, "Argument 'device_id' has to be an integer.")
            elif query:
                try:
                    query = query.split(",")

                    data_map = {}

                    for entry in query:
                        print(entry)
                        specifier = entry.split("-")
                        d_id = int(specifier[0])
                        if len(specifier) == 2:
                            if d_id not in data_map:
                                data_map[d_id] = []
                            data_map[d_id].append(specifier[1])
                        else:
                            data_map[d_id] = []

                    print(data_map)

                except Exception as e:
                    print(e)
                    return json_error(400, "Argument 'query' cannot be successfully parsed")
            else:
                return json_error(400, "Either 'device_id' or 'query' has to be provided as an argument.")

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

            response = {}

            for device in data_map:
                print(device)
                attributes = data_map[device] if data_map[device] else self.database.get_all_stored_attributes(device)

                print(attributes)

                chart_data = {}

                for attribute in attributes:
                    chart_data[attribute] = {"timestamps": [], "values": []}
                    result = self.database.get_device_attribute_data(device, attribute, datetime_from, datetime_to,
                                                                     smartround=smartround)

                    for entry in result:
                        entry_time = entry[0]
                        chart_data[attribute]["timestamps"].append(int(entry_time.timestamp()))
                        chart_data[attribute]["values"].append(entry[1])

                    response[device] = chart_data

            return response

        #########
        # FORMS #
        #########

        @self.app.route("/dialog/<dialog_name>", methods=["POST"])
        def dialog(dialog_name):
            if "add_new_device" in dialog_name:
                device_type = dialog_name.split("_")[-1]
                for device in loaded_devices:
                    if device.type == device_type:
                        fields = device.config_fields
                        return render_template("dialogs/add_new_device.html", fields=fields, device_type=device_type)

            if "edit_device" in dialog_name:
                device_id = int(dialog_name.split("_")[-1])
                device = self.manager.get_device(device_id)
                return render_template("dialogs/edit_device.html", id=device_id, device=device)

            if "json_attributes_to_store" in dialog_name:
                device_id = int(dialog_name.split("_")[-1])
                device = self.manager.get_device(device_id)
                json = self.manager.last_messages[device_id]
                return render_template(
                    "dialogs/json_attributes_to_store.html",
                    id=device_id,
                    device=device,
                    json=json[1]
                )

            template_name = f"dialogs/{dialog_name}.html"
            return render_template(template_name, loaded_devices=loaded_devices)

        @self.app.route("/add_new_device", methods=["POST"])
        def add_new_device():
            device_class = get_device_class(request.form["__device_type__"])
            device_label = request.form["__device_label__"]
            config = parse_config(request.form, device_class)
            settings = {"configuration": config}
            new_device = device_class(settings)
            new_device.set_label(device_label)
            database_device = self.database.add_device(new_device)
            self.manager.register_device(database_device.id, new_device)
            return "ok"

        @self.app.route("/edit_device/<int:device_id>", methods=["POST"])
        def edit_device(device_id):
            device_class = get_device_class(request.form["__device_type__"])
            device_label = request.form["__device_label__"]
            config = parse_config(request.form, device_class)
            device = self.manager.get_device(device_id)
            device.update_config(config)
            device.set_label(device_label)
            self.database.update_device_settings(device_id, device.settings)
            self.manager.add_changed("devices")
            return "ok"

        @self.app.route("/delete_device/<int:device_id>", methods=["POST"])
        def delete_device(device_id):
            self.database.delete_device(device_id)
            device = self.manager.get_device(device_id)
            device.exit()
            self.manager.delete_device(device_id)
            return "ok"

        @self.app.route("/edit_json_attributes_to_store/<int:device_id>", methods=["POST"])
        def edit_json_attributes_to_store(device_id):
            device = self.manager.get_device(device_id)
            device.clear_storage_attributes()
            for attribute in request.form:
                device.add_storage_attribute(attribute)
            self.database.update_device_settings(device_id, device.settings)
            self.manager.add_changed("data")
            return "ok"

        #################
        # JINJA FILTERS #
        #################

        @self.app.template_filter("generate_device_name")
        def generate_device_name(device):
            label = device.get_label()
            return label if label else device.type + " device"

        #########
        # OTHER #
        #########

        def _emit_notification(notification_type, value):
            self.sio.emit(notification_type, value, namespace='/')

        def content_change_watcher():
            while self.active:
                if self.connections > 0:
                    pages = []
                    for device in self.manager.get_devices().values():
                        while device.changed:
                            page_name = device.changed.pop()
                            if page_name not in pages:
                                pages.append(page_name)

                    while self.manager.changed:
                        page_name = self.manager.changed.pop()
                        if page_name not in pages:
                            pages.append(page_name)

                    for page_name in pages:
                        _emit_notification("content-change-notification", page_name)

                time.sleep(1)

        Thread(target=content_change_watcher).start()

        self.serverThread = Thread(target=self._run)
        self.serverThread.daemon = True
        self.serverThread.start()
        # self.app.run(self.host, self.port, use_reloader=True, debug=True)

    def _run(self):
        self.app.run(self.host, self.port)
        # serve(self.app, host=self.host, port=self.port)

    def exit(self):
        self.active = False
