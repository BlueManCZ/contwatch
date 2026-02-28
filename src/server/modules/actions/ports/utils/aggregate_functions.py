AGGREGATE_FUNCTIONS = {
    "Minimum": lambda *args: min(args),
    "Maximum": lambda *args: max(args),
    "Summation": lambda *args: sum(args),
    "Average": lambda *args: sum(args) / len(args),
    "Median": lambda *args: sorted(args)[len(args) // 2],
}
