from modules import settings

from datetime import datetime
from os import path
from platform import processor
from subprocess import run
from sys import getsizeof


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
        output = run(command, shell=True, capture_output=True)
        if output.stderr:
            return "Unknown"
        else:
            return output.stdout.decode().split("\"")[1]
    except Exception:
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


def get_update_datetime():
    """Returns date of last update based currently on .git/FETCH_HEAD"""
    file_path = settings.REAL_PATH + "/../../.git/FETCH_HEAD"
    if path.isfile(file_path):
        file_datetime = datetime.fromtimestamp(path.getctime(file_path))
        return file_datetime.strftime("%Y-%m-%d")
    else:
        return "Unknown"
