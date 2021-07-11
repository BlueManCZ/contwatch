from flask import Flask, render_template
from threading import Thread


class FlaskFrontend:

    def __init__(self, host, port, manager):
        self.app = Flask(__name__)
        self.host = host
        self.port = port
        self.manager = manager

        @self.app.route("/")
        @self.app.route("/index")
        def hello_world():
            return render_template("index.html", devices=self.manager.registered_devices)

        self.serverThread = Thread(target=self._run)
        self.serverThread.daemon = True
        self.serverThread.start()

    def _run(self):
        self.app.run(self.host, self.port)
