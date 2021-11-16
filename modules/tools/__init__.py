from platform import processor
from subprocess import check_output, CalledProcessError
from sys import getsizeof


def cpu_model():
    try:
        command = "LC_ALL=c lscpu | grep 'Model name'"
        output = (check_output(command, shell=True).strip()).decode()
        return " ".join(output.split()[2:])
    except CalledProcessError:
        return processor()


def distribution():
    try:
        command = "cat /etc/os-release | grep PRETTY_NAME"
        output = (check_output(command, shell=True).strip()).decode()
        return output.split("\"")[1]
    except CalledProcessError:
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
