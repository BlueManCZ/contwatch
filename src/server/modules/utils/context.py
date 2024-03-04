class Context:
    """Class for passing references to constructors"""

    def __init__(self, manager):
        self._manager = manager

    @property
    def manager(self):
        return self._manager
