from platform import processor
from subprocess import check_output, CalledProcessError


def get_cpu_model():
    try:
        command = "lscpu | grep 'Model name'"
        output = (check_output(command, shell=True).strip()).decode()
        return " ".join(output.split()[2:])
    except CalledProcessError:
        return processor()
