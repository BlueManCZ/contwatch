import inspect

from time import time


class BlueprintInit:
    def __init__(self, manager):
        self._manager = manager

    @property
    def manager(self):
        return self._manager


def this_name():
    """Returns the name of the function that called this function"""
    return inspect.stack()[1].function


def get_current_seconds():
    """Returns result of time() as integer"""
    return int(time())


def linearize(input_json, result=None, current_branch=()):
    if result is None:
        result = {}
    for attribute in input_json:
        if isinstance(input_json[attribute], dict):
            new_branch = list(current_branch)
            new_branch.append(attribute)
            linearize(input_json[attribute], result, new_branch)
        else:
            branch = list(current_branch)
            branch.append(attribute)
            result["/".join(branch)] = input_json[attribute]
    return result


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


class ModulesRegistrator:
    """Handles modules registration and their exit on shutdown"""

    def __init__(self):
        self.registered_modules = []

    def add(self, *modules):
        for module in modules:
            self.registered_modules.append(module)

    def exit(self):
        for module in self.registered_modules:
            module.exit()


def parse_config(config, handler_class):
    parsed_config = {}

    for field in config:
        if field in handler_class.config_fields:
            field_type = handler_class.config_fields[field][0]
            value = config[field]
            # if not value:
            #     continue
            if field_type in ["int", "handlerInstance", "workflowInstance"]:
                value = int(value)
            elif field_type == "float":
                value = float(value)
            elif field_type == "bool":
                value = bool(value)
            parsed_config[field] = value

    for field in handler_class.config_fields:
        if len(handler_class.config_fields[field]) > 2 and field not in parsed_config:
            parsed_config[field] = handler_class.config_fields[field][2]

        if handler_class.config_fields[field][0] == "bool":
            if f"_{field}_" not in config:
                parsed_config[field] = False

    return parsed_config
