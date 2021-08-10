from kanren import run, eq, membero, var, conde, lall, lany


class Device:
    def __init__(self, value):
        self.value = value


def my_func(device, value):
    y = var()
    return lall(eq(y, device.value), eq(y, value))


def higher(value, threshold, maximum):
    return membero(value, range(threshold + 1, maximum))


def lower(value, threshold, minimum):
    return membero(value, range(minimum, threshold))


x = var()
z = var()

d1 = Device(5)
d2 = Device(7)

# print(run(0, x, eq(x, my_func(d1, 5))))
if run(0, True, higher(x, 20, 100), lower(x, 30, 0))[0]:
    print("Yeeees")
