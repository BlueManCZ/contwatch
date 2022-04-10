from modules import settings, tools
from modules.engine import HandlerManager
from modules.engine.actions import *
from modules.handlers import *

from datetime import datetime, timedelta
from flask import Flask, redirect, render_template, request
from flask_socketio import SocketIO
from os import path
from time import sleep
from threading import Thread

import platform


class FlaskWebServer:

    def __init__(self, _manager: HandlerManager, _database):
        self.app = Flask(__name__)
        self.host = settings.WEB_SERVER_ADDRESS
        self.port = settings.WEB_SERVER_PORT
        self.manager = _manager
        self.database = _database
        self.start_datetime = datetime.now()
        self.sio = SocketIO(
            self.app,
            async_mode="eventlet",
            cors_allowed_origins=f"{settings.WEB_SERVER_ORIGINS}"
        )
        self.connections = 0
        self.active = True
        self.site_config = {}  # TODO: Store JSON in file or database
        self.cache = {}

        ###########
        # SOCKETS #
        ###########

        def emit_notification(notification_type, value):
            self.sio.emit(notification_type, value, namespace="/")

        @self.sio.on("connect")
        def connect():
            self.connections += 1
            emit_notification("content-change-notification", "details")

        @self.sio.on("disconnect")
        def disconnect():
            self.connections -= 1
            emit_notification("content-change-notification", "details")

        #########
        # VIEWS #
        #########

        @self.app.route("/")
        def index():
            return redirect("overview")

        @self.app.route("/index")
        def index_redirect():
            return redirect("overview")

        @self.app.route("/<page_name>")
        def page(page_name):
            return render_template("layouts/default.html", manager=self.manager, page=page_name)

        @self.app.route("/<_>", methods=["POST"])
        def not_found(_):
            return "Not found"

        @self.app.route("/overview", methods=["POST"])
        def overview():
            messages = self.manager.message_queue.copy()
            messages.reverse()
            return render_template("pages/overview.html", manager=self.manager, messages=messages)

        @self.app.route("/inspector", methods=["POST"])
        def inspector():
            return render_template("pages/inspector.html", manager=self.manager, views=self.database.get_chart_views())

        @self.app.route("/actions", methods=["POST"])
        def actions():
            return render_template("pages/actions.html", manager=self.manager)

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
                attributes[handler_id] = storage_attributes
                ghost_attributes[handler_id] = []

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
                "python_version": platform.python_version(),
                "distribution": tools.distribution(),
                "uptime": int((datetime.now() - self.start_datetime).total_seconds()),
                "handlers": len(self.manager.get_handlers()),
                "connections": self.connections,
                "version": tools.get_update_datetime(),
                "database_type": settings.DB_TYPE,
                "database_size": path.getsize(settings.DB_SQLITE_FILE),
                "cache_size": tools.get_size(self.cache)
            }
            return render_template("pages/details.html", data=dictionary)

        #######
        # API #
        #######

        @self.app.route("/api")
        def api():
            return tools.json_error(400, "Specify your API request")

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

        def build_chart_event_data(handler_id, event, event_type, datetime_from, datetime_to):
            response = {}
            chart_data = {event: {"timestamps": [], "payload": []}}
            result = self.database.get_handler_stored_event_data(handler_id, event, True if event_type == "in" else False,
                                                                 datetime_from, datetime_to)
            for entry in result:
                entry_time = entry[0]
                chart_data[event]["timestamps"].append(int(entry_time.timestamp()))
                chart_data[event]["payload"].append(entry[1])

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
                    return tools.json_error(400, "Argument 'handler_id' has to be an integer.")
            elif raw_query:
                try:
                    data_map = parse_query(raw_query)
                except Exception as e:
                    print(e)
                    return tools.json_error(400, "Argument 'query' cannot be successfully parsed")
            else:
                return tools.json_error(400, "Either 'handler_id' or 'query' has to be provided as an argument.")

            if date_from:
                try:
                    datetime_from = datetime.strptime(date_from, "%Y-%m-%d")
                except Exception as e:
                    print(e)
                    return tools.json_error(400, "Argument 'date_from' is not in '%Y-%m-%d' format.")

            if date_to:
                try:
                    datetime_to = datetime.strptime(date_to, "%Y-%m-%d")
                    datetime_to += timedelta(days=1)
                except Exception as e:
                    print(e)
                    return tools.json_error(400, "Argument 'date_to' is not in '%Y-%m-%d' format.")

            if smartround:
                try:
                    smartround = int(smartround)
                except Exception as e:
                    print(e)
                    return tools.json_error(400, "Argument 'smartround' has to be an integer.")

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

        @self.app.route("/api/events")
        def api_events():
            handler_id = request.args["handler_id"] if "handler_id" in request.args else ""
            event_name = request.args["name"] if "name" in request.args else ""
            event_type = request.args["type"] if "type" in request.args else ""
            date_from = request.args["date_from"] if "date_from" in request.args else ""
            date_to = request.args["date_to"] if "date_to" in request.args else ""

            datetime_from = datetime.min
            datetime_to = datetime.now()

            if handler_id:
                try:
                    handler_id = int(handler_id)
                except Exception as e:
                    print(e)
                    return tools.json_error(400, "Argument 'handler_id' has to be an integer.")
            else:
                return tools.json_error(400, "Argument 'handler_id' has to be provided as an argument.")

            if date_from:
                try:
                    datetime_from = datetime.strptime(date_from, "%Y-%m-%d")
                except Exception as e:
                    print(e)
                    return tools.json_error(400, "Argument 'date_from' is not in '%Y-%m-%d' format.")

            if date_to:
                try:
                    datetime_to = datetime.strptime(date_to, "%Y-%m-%d")
                    datetime_to += timedelta(days=1)
                except Exception as e:
                    print(e)
                    return tools.json_error(400, "Argument 'date_to' is not in '%Y-%m-%d' format.")

            return build_chart_event_data(handler_id, event_name, event_type, datetime_from, datetime_to)

        #########
        # FORMS #
        #########

        @self.app.route("/dialog/<dialog_name>", methods=["POST"])
        def dialog(dialog_name):
            template_name = f"dialogs/{dialog_name}.html"

            if "add_new_handler" == dialog_name:
                handler_type = request.json["handler_type"]
                for handler in loaded_handlers:
                    if handler.type == handler_type:
                        fields = handler.config_fields
                        return render_template(template_name, fields=fields, handler_type=handler_type)

            if "edit_handler" == dialog_name:
                handler_id = int(request.json["handler_id"])
                handler = self.manager.get_handler(handler_id)
                return render_template(template_name, id=handler_id, handler=handler)

            if "edit_event_listener" == dialog_name:
                listener_id = int(request.json["listener_id"])
                return render_template(
                    template_name,
                    handlers=self.manager.get_handlers(),
                    listener=self.manager.event_manager.get_event_listener(listener_id),
                    workflows=self.manager.event_manager.get_workflows())

            if "json_attributes_to_store" == dialog_name:
                handler_id = int(request.json["handler_id"])
                handler = self.manager.get_handler(handler_id)
                json = self.manager.last_messages[handler_id][1]

                def linearize_json(input_json, result, current_branch=()):
                    for attribute in input_json:
                        if isinstance(input_json[attribute], dict):
                            new_branch = list(current_branch)
                            new_branch.append(attribute)
                            linearize_json(input_json[attribute], result, new_branch)
                        else:
                            branch = list(current_branch)
                            branch.append(attribute)
                            result.append("/".join(branch))

                attributes = []
                linearize_json(json, attributes)

                print(attributes)

                return render_template(
                    template_name,
                    id=handler_id,
                    handler=handler,
                    attributes=attributes
                )

            if "add_new_routine" == dialog_name:
                routine_type = request.json["routine_type"]
                target_workflow = self.manager.event_manager.get_workflow(int(request.json["target_workflow"]))
                for routine in available_routines:
                    if routine.type == routine_type:
                        fields = routine.config_fields
                        return render_template(
                            template_name,
                            fields=fields,
                            routine=routine,
                            workflow=target_workflow,
                            handlers=self.manager.get_handlers(),
                            workflows=self.manager.event_manager.get_workflows(),
                        )

            if "edit_routine" == dialog_name:
                routine_id = request.json["routine_id"]
                routine = self.manager.event_manager.get_routine(int(routine_id))
                return render_template(
                    template_name,
                    routine=routine,
                    handlers=self.manager.get_handlers(),
                    workflows=self.manager.event_manager.get_workflows(),
                )

            if "choose_routine_type" in dialog_name:
                target_workflow = request.json["target_workflow"]
                return render_template(
                    template_name,
                    available_routines=available_routines,
                    target_workflow=target_workflow
                )

            return render_template(
                template_name,
                loaded_handlers=loaded_handlers,
                handlers=self.manager.get_handlers(),
                workflows=self.manager.event_manager.get_workflows()
            )

        @self.app.route("/add_new_handler", methods=["POST"])
        def add_new_handler():
            handler_class = get_handler_class(request.form["handler_type"])
            handler_label = request.form["handler_label"]
            config = tools.parse_config(request.form, handler_class)
            handler_settings = {"configuration": config}
            new_handler = handler_class(handler_settings)
            new_handler.set_label(handler_label)
            database_handler = self.database.add_handler(new_handler)
            self.manager.register_handler(database_handler.id, new_handler)
            return "ok"

        @self.app.route("/edit_handler/<int:handler_id>", methods=["POST"])
        def edit_handler(handler_id):
            handler_class = get_handler_class(request.form["handler_type"])
            handler_label = request.form["handler_label"]
            config = tools.parse_config(request.form, handler_class)
            handler = self.manager.get_handler(handler_id)
            Thread(target=lambda: handler.update_config(config)).start()
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

        @self.app.route("/save_chart_view", methods=["POST"])
        def save_chart_view():
            view_id = request.json["view_id"]
            if not request.json["label"]:
                return {"status": False, "error": "View label cannot be empty"}, 400
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

        @self.app.route("/add_new_event_listener", methods=["POST"])
        def add_new_event_listener():
            label = request.form["listener_label"]
            if not label:
                return tools.json_notif(
                    400, "error", "Empty name",
                    f"Event name cannot be empty."
                )
            handler_id = int(request.form["listener_handler"])
            listener = EventListener(handler_id, label)
            if self.manager.event_manager.add_event_listener(listener):
                workflow_id = request.form["listener_workflow"]
                if workflow_id:
                    workflow_id = int(workflow_id)
                    listener.set_workflow(self.manager.event_manager.get_workflow(workflow_id))
                data_listener_status = bool(request.form["data_listener"]) if "data_listener" in request.form else False
                listener.set_data_listener_status(data_listener_status)
                db_listener = self.database.add_event_listener(listener)
                listener.set_id(db_listener.id)
                self.manager.add_changed("actions")
                return {"status": "ok"}
            return tools.json_notif(
                400, "error", "Listener exists",
                f"Event listener for event \"{label}\" already exists."
            )

        @self.app.route("/edit_event_listener/<int:listener_id>", methods=["POST"])
        def edit_event_listener(listener_id):
            listener = self.manager.event_manager.get_event_listener(listener_id)
            listener_label = request.form["listener_label"]
            listener.set_label(listener_label)
            handler_id = int(request.form["listener_handler"])
            listener.set_handler_id(handler_id)
            workflow_id = request.form["listener_workflow"]
            if workflow_id:
                workflow_id = int(workflow_id)
                listener.set_workflow(self.manager.event_manager.get_workflow(workflow_id))
            else:
                listener.delete_workflow()
            data_listener_status = bool(request.form["data_listener"]) if "data_listener" in request.form else False
            listener.set_data_listener_status(data_listener_status)
            self.database.update_event_listener(listener)
            self.manager.add_changed("actions")
            return {"status": "ok"}

        @self.app.route("/delete_event_listener/<int:listener_id>", methods=["POST"])
        def delete_event_listener(listener_id):
            self.database.delete_event_listener(listener_id)
            listener = self.manager.event_manager.get_event_listener(listener_id)
            self.manager.event_manager.delete_event_listener(listener)
            self.manager.add_changed("actions")
            return {"status": "ok"}

        @self.app.route("/add_new_workflow/<int:listener_id>", methods=["POST"])
        def add_new_workflow(listener_id):
            listener = self.manager.event_manager.get_event_listener(listener_id)

            if listener and listener.workflow:
                return tools.json_notif(
                    400, "error", "Workflow error",
                    f"Event listener already has associated workflow."
                )

            db_workflow = self.database.add_workflow()
            new_workflow = Workflow()
            new_workflow.set_id(db_workflow.id)

            self.manager.event_manager.add_workflow(new_workflow)

            if listener:
                db_listener = self.database.get_event_listener_by_id(listener_id)
                self.database.update_event_listener(listener_id, db_listener.label, new_workflow.id)
                listener.set_workflow(new_workflow)

            self.manager.add_changed("actions")
            return {"status": "ok"}

        @self.app.route("/delete_workflow/<int:workflow_id>", methods=["DELETE"])
        def delete_workflow(workflow_id):
            workflow_instance = self.manager.event_manager.get_workflow(workflow_id)
            for routine in workflow_instance.routines.copy():
                self.manager.event_manager.delete_routine(routine.id)

            listeners = self.manager.event_manager.get_event_listeners()

            for listener in listeners:
                if listener.workflow and listener.workflow.id == workflow_id:
                    listener.delete_workflow()

            for workflow_instance in self.manager.event_manager.get_workflows():
                for routine in workflow_instance.routines.copy():
                    if routine.type == "perform_workflow" and routine.get_config()["workflow"] == workflow_id:
                        self.manager.event_manager.delete_routine(routine.id)

            self.manager.event_manager.delete_workflow(workflow_id)
            self.database.delete_workflow(workflow_id)
            self.manager.add_changed("actions")
            return {"status": "ok"}

        @self.app.route("/add_new_routine", methods=["POST"])
        def add_new_routine():
            routine_class = get_routine_class(request.form["routine_type"])
            config = tools.parse_config(request.form, routine_class)
            workflow_id = int(request.form["workflow_id"])
            target_workflow = self.manager.event_manager.get_workflow(workflow_id)
            routine_settings = {"configuration": config}
            new_routine = routine_class(routine_settings, self.manager)
            new_routine.workflow = target_workflow
            new_routine.position = len(target_workflow.routines)
            target_workflow.add_routine(new_routine)
            database_routine = self.database.add_routine(new_routine)
            new_routine.set_id(database_routine.id)

            self.manager.add_changed("actions")
            return {"status": "ok"}

        @self.app.route("/edit_routine/<int:routine_id>", methods=["POST"])
        def edit_routine(routine_id):
            routine = self.manager.event_manager.get_routine(routine_id)
            routine_class = get_routine_class(routine.type)
            config = tools.parse_config(request.form, routine_class)
            routine.update_config(config)
            self.database.update_routine(routine)
            self.manager.add_changed("actions")
            return {"status": "ok"}

        @self.app.route("/move_routine", methods=["POST"])
        def move_routine():
            self.manager.event_manager.move_routine(
                request.json["workflow_id"],
                request.json["routine_id"],
                request.json["index"]
            )
            return {"status": "ok"}

        @self.app.route("/delete_routine/<int:routine_id>", methods=["POST"])
        def delete_routine(routine_id):
            self.manager.event_manager.delete_routine(routine_id)
            return {"status": "ok"}

        #################
        # JINJA FILTERS #
        #################

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
                        emit_notification("content-change-notification", page_name)

                sleep(0.1)

        def cache_refresher():
            while self.active:
                now = datetime.now()
                for query in self.cache:
                    for entry in self.cache[query]:
                        if entry["t"].day == now.day and entry["t"].month == now.month and entry["t"].year == now.year:
                            print("Rebuilding cache")
                            entry["r"] = build_chart_data(parse_query(query), entry["f"], now, entry["s"])
                            print("Rebuilding cache [done]")
                        else:
                            self.cache[query].remove(entry)
                sleep(settings.CACHING_INTERVAL * 60)

        Thread(target=content_change_watcher).start()

        refresher = Thread(target=cache_refresher)
        refresher.daemon = True
        refresher.start()

        self.serverThread = Thread(target=self.run)
        self.serverThread.start()
        self.serverThread.join()

    def run(self):
        self.sio.run(self.app, self.host, self.port, debug=settings.WEB_SERVER_DEBUG, use_reloader=False)

    def exit(self):
        self.active = False
