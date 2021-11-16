from platform import processor
from subprocess import check_output, CalledProcessError


def cpu_model():
    try:
        command = "lscpu | grep 'Model name'"
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
