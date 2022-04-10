def is_int(element):
    try:
        int(element)
        return True
    except ValueError:
        return False


def is_float(element):
    try:
        float(element)
        return True
    except ValueError:
        return False
