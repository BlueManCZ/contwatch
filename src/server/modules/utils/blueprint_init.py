class BlueprintInit:
    """Class for passing references to blueprints constructors"""

    def __init__(self, manager):
        self._manager = manager

    @property
    def manager(self):
        return self._manager
