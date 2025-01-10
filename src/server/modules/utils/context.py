class Context:
    """Class for passing references to constructors"""

    def __init__(self, manager, socketio=None):
        self._manager = manager
        self._socketio = socketio

    @property
    def manager(self):
        return self._manager

    @property
    def socketio(self):
        return self._socketio
