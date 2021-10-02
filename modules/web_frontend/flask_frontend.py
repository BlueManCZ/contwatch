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
        if field in device_class.fields:
            field_type = device_class.fields[field][0]
            field_data = request.form[field]
            value = field_data
            if field_type == "int":
                value = int(field_data)
            elif field_type == "float":
                value = float(field_data)
            elif field_type == "bool":
                value = bool(field_data)
            config[field] = value

    for field in device_class.fields:
        if len(device_class.fields[field]) > 2 and field not in config:
            config[field] = device_class.fields[field][2]

        if device_class.fields[field][0] == "bool":
            if field not in http_form:
                config[field] = False

    return config


class FlaskFrontend:

    def __init__(self, host, port, manager, database):
        self.app = Flask(__name__)
        self.host = host
        self.port = port
        self.manager = manager
        self.start_time = time.time()
        self.sio = SocketIO(self.app)
        self.connections = 0
        self.active = True

        @self.sio.on("connect")
        def connect():
            self.connections += 1

        @self.sio.on("disconnect")
        def disconnect():
            self.connections -= 1

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
            return render_template("pages/devices.html", devices=self.manager.registered_devices)

        @self.app.route("/details", methods=["POST"])
        def details():
            data = {
                "node": platform.node(),
                "release": platform.release(),
                "machine": platform.machine(),
                "architecture": platform.architecture(),
                "processor": platform.processor(),
                "uptime": time.strftime('%H:%M:%S', time.gmtime(time.time() - self.start_time))
            }
            return render_template("pages/details.html", data=data)

        @self.app.route("/dialog/<dialog_name>", methods=["POST"])
        def dialog(dialog_name):
            if "configure_device" in dialog_name:
                device_type = dialog_name.split("_")[2]
                for device in loaded_devices:
                    if device.type == device_type:
                        fields = device.fields
                        return render_template("dialogs/configure_device.html", fields=fields, device_type=device_type)

            if "edit_device" in dialog_name:
                device_id = int(dialog_name.split("_")[2])
                device = self.manager.registered_devices[device_id]
                print(device.fields)
                return render_template("dialogs/edit_device.html", id=device_id, device=device)

            return render_template(f"dialogs/{dialog_name}.html", loaded_devices=loaded_devices)

        @self.app.route("/configure_new_device", methods=["POST"])
        def configure_new_device():
            device_class = get_device_class(request.form["device_type"])
            config = parse_config(request.form, device_class)
            new_device = device_class(config)
            database_device = database.add_device(new_device)
            self.manager.register_device(new_device, database_device.id)

            return redirect("/devices")

        @self.app.route("/edit_device", methods=["POST"])
        def edit_device():
            device_class = get_device_class(request.form["device_type"])
            config = parse_config(request.form, device_class)
            device_id = int(request.form["device_id"])
            database.update_device_config(device_id, config)
            self.manager.registered_devices[device_id].update_config(config)

            return redirect("/devices")

        def content_change_watcher():
            while self.active:
                if self.connections > 0:
                    for device in self.manager.registered_devices:
                        if self.manager.registered_devices[device].changed:
                            self.sio.emit("content-change-notification", "devices", namespace='/')
                            self.manager.registered_devices[device].changed = False

                    if self.manager.changed:
                        self.sio.emit("content-change-notification", "overview", namespace='/')
                        self.manager.changed = False

                time.sleep(0.1)

        Thread(target=content_change_watcher).start()

        self.serverThread = Thread(target=self._run)
        self.serverThread.daemon = True
        self.serverThread.start()
        # self.app.run(self.host, self.port, use_reloader=True, debug=True)

    def _run(self):
        self.app.run(self.host, self.port)
        #serve(self.app, host=self.host, port=self.port)
