from modules.core.actions.routines.helpers.conversions import replace_variables
from modules.core.actions.routines.helpers.evaluation import eval_expr


def parse_condition(condition, payload, manager):
    if "==" in condition:
        operator = "=="
    elif ">=" in condition:
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
        operator = "??"

    split = condition.split(f"{operator}")
    left = split[0]
    left = replace_variables(left, payload, manager)

    right = None
    if len(split) > 1:
        right = split[1]
        right = replace_variables(right, payload, manager)

    return operator, left, right


def check_condition(condition, payload, manager):
    functions = {
        "??": lambda le, ri: le,
        ">=": lambda le, ri: le >= ri,
        "<=": lambda le, ri: le <= ri,
        ">": lambda le, ri: le > ri,
        "<": lambda le, ri: le < ri,
        "==": lambda le, ri: le == ri,
        "!=": lambda le, ri: le != ri,
    }

    operator, left, right = parse_condition(condition, payload, manager)

    try:
        if right and right[0] == '"' and right[-1] == '"':
            right = right[1:-1]
        elif right:
            right = right.replace(" ", "")
            right = eval_expr(right)
        if left[0] == '"' and left[-1] == '"':
            left = left[1:-1]
        else:
            left = left.replace(" ", "")
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
