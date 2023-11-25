from .abstract_port import AbstractPort
from ..controls import Select


class AttributePort(AbstractPort):
    name = "attribute"
    label = "Attribute"
    hide = True

    def __init__(self, context, *args):
        super().__init__(context, *args)
        self.controls = [
            Select(
                sum(
                    (
                        [
                            {
                                "label": attribute.get_name(),
                                "value": attribute.get_id(),
                            }
                            for attribute_name, attribute in attributes.items()
                        ]
                        for handler_id, attributes in self.context.manager.registered_attributes.copy().items()
                    ),
                    [],
                ),
            )
        ]
