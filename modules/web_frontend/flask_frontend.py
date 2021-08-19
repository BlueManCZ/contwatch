import platform
import time

from modules.devices import loaded_devices

from flask import Flask, render_template
from flask_socketio import SocketIO
from threading import Thread


class FlaskFrontend:

    def __init__(self, host, port, manager):
        self.app = Flask(__name__)
        self.host = host
        self.port = port
        self.manager = manager
        self.start_time = time.time()
        self.sio = SocketIO(self.app)
        self.connections = 0
        self.active = True

        @self.sio.on('connect')
        def connect():
            self.connections += 1

        @self.sio.on('disconnect')
        def disconnect():
            self.connections -= 1

        @self.app.route("/")
        @self.app.route("/index")
        def index():
            return render_template("layouts/default.html")

        @self.app.route("/overview", methods=["POST"])
        def overview():
            return render_template("pages/overview.html")

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
            if dialog_name == "add_device":
                return render_template("dialogs/add_device.html", loaded_devices=loaded_devices)
            return dialog_name

        def content_change_watcher():
            while self.active:
                if self.connections > 0:
                    for device in self.manager.registered_devices:
                        if self.manager.registered_devices[device].changed:
                            self.sio.emit("content-change-notification", "devices", namespace='/')
                            self.manager.registered_devices[device].changed = False
                time.sleep(1)

        Thread(target=content_change_watcher).start()

        # self.serverThread = Thread(target=self._run)
        # self.serverThread.daemon = True
        # self.serverThread.start()
        self.app.run(self.host, self.port, use_reloader=True, debug=True)

    def _run(self):
        self.app.run(self.host, self.port)
