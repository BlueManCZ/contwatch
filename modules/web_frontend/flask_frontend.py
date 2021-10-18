import platform
import time

from modules.devices import *

from flask import Flask, redirect, render_template, request
from flask_socketio import SocketIO
from threading import Thread
from waitress import serve


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


class FlaskFrontend:

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
                labels = self.database.get_all_stored_labels(device_id)
                attributes[device_id] = []
                ghost_attributes[device_id] = []
                for attribute in labels:
                    if attribute in storage_attributes:
                        attributes[device_id].append(attribute)
                    else:
                        ghost_attributes[device_id].append(attribute)

            return render_template("pages/data.html", site_config=self.site_config, manager=self.manager, attributes=attributes, ghost_attributes=ghost_attributes)

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
                return render_template("dialogs/json_attributes_to_store.html", id=device_id, device=device, json=json[1])
            return render_template(f"dialogs/{dialog_name}.html", loaded_devices=loaded_devices)

        @self.app.route("/add_new_device", methods=["POST"])
        def add_new_device():
            device_class = get_device_class(request.form["__device_type__"])
            device_label = request.form["__device_label__"]
            config = parse_config(request.form, device_class)
            new_device = device_class(config)
            new_device.set_label(device_label)
            database_device = self.database.add_device(new_device)
            self.manager.register_device(new_device, database_device.id)
            return "ok"

        @self.app.route("/edit_device/<int:device_id>", methods=["POST"])
        def edit_device(device_id):
            print("Edit")
            device_class = get_device_class(request.form["__device_type__"])
            device_label = request.form["__device_label__"]
            config = parse_config(request.form, device_class)
            device = self.manager.get_device(device_id)
            device.update_config(config)
            device.set_label(device_label)
            self.database.update_device(device_id, label=device_label, config=device.config)
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
                print(attribute)
            self.database.update_device(device_id, config=device.config, label=device.get_label())
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
                    for device in self.manager.get_devices().values():
                        while device.changed:
                            page_name = device.changed.pop()
                            _emit_notification("content-change-notification", page_name)

                    while self.manager.changed:
                        page_name = self.manager.changed.pop()
                        _emit_notification("content-change-notification", page_name)

                time.sleep(0.1)

        Thread(target=content_change_watcher).start()

        self.serverThread = Thread(target=self._run)
        self.serverThread.daemon = True
        self.serverThread.start()
        # self.app.run(self.host, self.port, use_reloader=True, debug=True)

    def _run(self):
        self.app.run(self.host, self.port)
        #serve(self.app, host=self.host, port=self.port)

    def exit(self):
        self.active = False
