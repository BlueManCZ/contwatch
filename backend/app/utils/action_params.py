import json


def merge_params(message_json: str, overrides: dict) -> str:
    """Merge param overrides into action message's 'params' dict."""
    parsed = json.loads(message_json)
    params = parsed.get("params", {})
    for key, value in overrides.items():
        params[key] = str(value) if not isinstance(value, str) else value
    parsed["params"] = params
    return json.dumps(parsed)
