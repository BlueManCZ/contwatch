def linearize(input_json: dict) -> dict:
    """Flatten nested JSON using '/' delimiters.

    Example: {"charger": {"voltage": 48.5}} -> {"charger/voltage": 48.5}
    Lists get indexed as string keys: {"temps": [20, 21]} -> {"temps/0": 20, "temps/1": 21}
    """
    result: dict = {}

    def _recurse(obj: dict, branch: tuple = ()) -> None:
        for key in obj:
            value = obj[key]
            if isinstance(value, dict):
                _recurse(value, (*branch, key))
            elif isinstance(value, list):
                for index, item in enumerate(value):
                    _recurse({str(index): item}, (*branch, key))
            else:
                result["/".join((*branch, key))] = value

    _recurse(input_json)
    return result
