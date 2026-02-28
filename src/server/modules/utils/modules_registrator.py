class ModulesRegistrator:
    """Handles modules registration and their exit on shutdown"""

    def __init__(self):
        self.registered_modules = []

    def add(self, *modules):
        for module in modules:
            self.registered_modules.append(module)

    def exit(self):
        for module in self.registered_modules:
            module.exit()
