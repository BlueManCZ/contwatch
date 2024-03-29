from datetime import datetime
from os import path
from platform import processor
from subprocess import run
from sys import getsizeof
from time import time
from json import load

from modules import settings


def cpu_model():
    try:
        command = "LC_ALL=c lscpu | grep 'Model name'"
        output = run(command, shell=True, capture_output=True)
        if output.stderr:
            return processor()
        else:
            return " ".join(output.stdout.decode().split()[2:])
    except Exception:
        return processor()


def distribution():
    try:
        command = "cat /etc/os-release | grep PRETTY_NAME"
        if path.isfile("/etc/redhat-release"):
            file = open("/etc/redhat-release")
            output = file.readline()
            return output.replace("\n", "")
        else:
            output = run(command, shell=True, capture_output=True)
            if output.stderr:
                return "Unknown"
            else:
                return output.stdout.decode().split('"')[1]
    except Exception:
        return "Unknown"


def get_update_datetime():
    """Returns date of last update based currently on .git/FETCH_HEAD"""
    file_path = settings.REAL_PATH + "/../../.git/FETCH_HEAD"
    if path.isfile(file_path):
        file_datetime = datetime.fromtimestamp(path.getctime(file_path))
        return file_datetime.strftime("%Y-%m-%d")
    else:
        return "Unknown"


def get_size(obj, seen=None):
    """Recursively finds size of objects"""
    size = getsizeof(obj)
    if seen is None:
        seen = set()
    obj_id = id(obj)
    if obj_id in seen:
        return 0
    # Important mark as seen *before* entering recursion to gracefully handle self-referential objects
    seen.add(obj_id)
    if isinstance(obj, dict):
        size += sum([get_size(v, seen) for v in obj.values()])
        size += sum([get_size(k, seen) for k in obj.keys()])
    elif hasattr(obj, "__dict__"):
        size += get_size(obj.__dict__, seen)
    elif hasattr(obj, "__iter__") and not isinstance(obj, (str, bytes, bytearray)):
        size += sum([get_size(i, seen) for i in obj])
    return size


def parse_config(http_form, handler_class):
    config = {}

    for field in http_form:
        field_new = field[1:-1]
        if field_new in handler_class.config_fields:
            field_type = handler_class.config_fields[field_new][0]
            field_data = http_form[field]
            value = field_data
            if field_type in ["int", "handlerInstance", "workflowInstance"]:
                value = int(field_data)
            elif field_type == "float":
                value = float(field_data)
            elif field_type == "bool":
                value = bool(field_data)
            config[field_new] = value

    for field in handler_class.config_fields:
        if len(handler_class.config_fields[field]) > 2 and field not in config:
            config[field] = handler_class.config_fields[field][2]

        if handler_class.config_fields[field][0] == "bool":
            if f"_{field}_" not in http_form:
                config[field] = False

    return config


def json_error(error, message):
    response = {
        "error": error,
        "message": message,
    }
    return response, error


def json_notif(code, status, title, message):
    response = {
        "status": status,
        "title": title,
        "message": message,
    }
    return response, code


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


def get_nested_attribute(json, attributes_row):
    attributes = attributes_row.split("/")
    attributes.reverse()
    result = json
    while attributes:
        attribute = attributes.pop()
        if attribute in result:
            result = result[attribute]
        else:
            return
    return result


def get_current_seconds():
    return int(time())


def get_version():
    """Returns version of the application based on package.json"""
    real_path = path.dirname(path.realpath(__file__))
    with open(f"{real_path}/../../package.json") as json_file:
        data = load(json_file)
        return data["version"]
