import re

from modules.engine.actions.routines.helpers.evaluation import eval_expr


def replace_variables(string, payload, manager):
    result = string
    search = re.search(r"(\bpayload\.[0-9]*\b)", string)
    if search:
        for group in search.groups():
            _, payload_index = group.split(".")
            result = result.replace(group, int(payload[payload_index]))

    search = re.search(r"(\bhandler\..*\.[A-Z,a-z]*\b)", string)
    if search:
        for group in search.groups():
            _, handler_id, attribute = group.split(".")
            last_message = manager.last_messages[int(handler_id)]
            result = result.replace(group, str(last_message[1][attribute]))
    return result


def parse_condition(condition, payload, manager):
    if ">=" in condition:
        operator = ">="
    elif "<=" in condition:
        operator = "<="
    elif ">" in condition:
        operator = ">"
    elif "<" in condition:
        operator = "<"
    elif "<>" in condition or "!=" in condition:
        operator = "!="
    else:
        operator = "=="

    left, right = condition.split(f" {operator} ")

    left = replace_variables(left, payload, manager)
    right = replace_variables(right, payload, manager)

    return operator, left, right


def check_condition(condition, payload, manager):
    functions = {
        ">=": lambda le, ri: le >= ri,
        "<=": lambda le, ri: le <= ri,
        ">": lambda le, ri: le > ri,
        "<": lambda le, ri: le < ri,
        "==": lambda le, ri: le == ri,
        "!=": lambda le, ri: le != ri,
    }

    operator, left, right = parse_condition(condition, payload, manager)

    try:
        if right[0] == "\"" and right[-1] == "\"":
            right = right[1:-1]
        else:
            right = eval_expr(right)
        if left[0] == "\"" and left[-1] == "\"":
            left = left[1:-1]
        else:
            left = eval_expr(left)
    except SyntaxError as error:
        print(error)
        return False
    except TypeError as error:
        print(error)
        return False

    if operator in functions:
        return functions[operator](left, right)

    return False
