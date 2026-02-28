class Color:
    GREY = "\033[90m"
    RED = "\033[91m"
    GREEN = "\033[92m"
    ORANGE = "\033[93m"
    BLUE = "\033[94m"
    PINK = "\033[95m"
    END = "\033[0m"
    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"


def color_print(message: str | dict, color: str = Color.END):
    print(color + str(message) + Color.END)
