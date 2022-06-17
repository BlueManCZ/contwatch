import re

from modules.tools import get_nested_attribute


def is_int(element):
    try:
        int(element)
        return True
    except ValueError:
        return False


def is_float(element):
    try:
        float(element)
        return True
    except ValueError:
        return False


def replace_variables(string, payload, manager):
    result = string
    search = re.findall(r"(\bpayload\.[0-9]*\b)", string)
    if search:
        for group in search:
            _, payload_index = group.split(".")
            payload_index = int(payload_index)
            if payload_index < len(payload):
                result = result.replace(group, str(payload[payload_index]))
            else:
                result = result.replace(group, "None")

    search = re.findall(r"(\bhandler\.[0-9]*\.[A-Z,a-z/]*\b)", string)
    if search:
        for group in search:
            try:
                _, handler_id, attribute = group.split(".")
                handler_id = int(handler_id)
                if handler_id in manager.last_messages:
                    json = manager.last_messages[handler_id][1]
                    result = result.replace(
                        group, str(get_nested_attribute(json, attribute))
                    )
            except Exception as error:
                print(error)
    return result
