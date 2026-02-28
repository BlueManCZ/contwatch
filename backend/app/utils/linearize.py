def linearize(input_json: dict, result: dict | None = None, current_branch: tuple = ()) -> dict:
    """Flatten nested JSON using '/' delimiters.

    Example: {"charger": {"voltage": 48.5}} -> {"charger/voltage": 48.5}
    Lists get indexed as string keys: {"temps": [20, 21]} -> {"temps/0": 20, "temps/1": 21}
    """
    if result is None:
        result = {}
    for attribute in input_json:
        value = input_json[attribute]
        if isinstance(value, dict):
            linearize(value, result, (*current_branch, attribute))
        elif isinstance(value, list):
            for index, item in enumerate(value):
                linearize({str(index): item}, result, (*current_branch, attribute))
        else:
            result["/".join((*current_branch, attribute))] = value
    return result
