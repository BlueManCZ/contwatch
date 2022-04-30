import re


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
            result = result.replace(group, str(payload[int(payload_index)]))

    search = re.findall(r"(\bhandler\..*\.[A-Z,a-z]*\b)", string)
    if search:
        for group in search:
            _, handler_id, attribute = group.split(".")
            last_message = manager.last_messages[int(handler_id)]
            result = result.replace(group, str(last_message[1][attribute]))
    return result
