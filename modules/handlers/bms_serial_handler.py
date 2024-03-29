from serial import SerialException
from .serial_handler import SerialHandler


def _byte(array, index):
    return array[index] * 256 + array[index + 1]


class BmsSerialHandler(SerialHandler):
    """Class for handling Jiabaida Battery Management System V4 connected to serial port."""

    type = "bms_serial"
    icon = type
    name = "Jiabaida BMS V4"
    config_fields = {
        "port": ["string", "Device port (e.g., /dev/ttyUSB0)"],
        "interval": ["int", "Fetching interval in seconds", 10],
        "timeout": ["float", "Timeout in seconds", 0.1],
        "auto-reconnect": ["bool", "Auto reconnect", True],
        "trim-echo": ["bool", "Trim echoed messages", False],
    }

    def _read_block(self, query):
        self.connection.flushInput()
        self.connection.flushOutput()
        self.connection.write(query)
        data = []
        length = 0

        # TODO: Auto detect echoed messages and trim them automatically.
        incoming_length = 11
        if not self.config("trim-echo"):
            incoming_length = 4
        for i in range(0, incoming_length):
            byte = int.from_bytes(self.connection.read(), "big")
            if i == incoming_length - 2:
                if byte != 0:
                    break
            if i == incoming_length - 1:
                length = byte

        for i in range(0, length):
            data.append(int.from_bytes(self.connection.read(), "big"))

        for i in range(0, 3):
            self.connection.read()

        return data

    def _read_message(self):
        if not self.first_tick():
            self.wait_for_interval(self.config("interval"))

        d1 = self._read_block(b"\xDD\xA5\x03\x00\xFF\xFD\x77")
        d2 = self._read_block(b"\xDD\xA5\x04\x00\xFF\xFC\x77")

        if not d1 or not d2:
            raise SerialException("Missing some block of data")

        current = (
            _byte(d1, 2) / 100
            if _byte(d1, 2) < 2**15
            else (_byte(d1, 2) - 2**16) / 100
        ) or 0

        json = {
            "voltage": _byte(d1, 0) / 100,
            "current": current,
            "capacity": _byte(d1, 4) * 10,
            "nominal-capacity": _byte(d1, 6) * 10,
            "cycles": _byte(d1, 8),
            "percentages": d1[19],
            "mos-state": d1[20],
            "temperatures": {
                # TODO: Number of temps is provided in data too, do this in loop.
                "1": (_byte(d1, 23) - 2731) / 10,
                "2": (_byte(d1, 25) - 2731) / 10,
            },
            "cells": {},
            "protection-bits": bin(_byte(d1, 16))[2:].zfill(16),
        }

        cell_count = d1[21]
        balancing = bin(_byte(d1, 14))[2:].zfill(16) + bin(_byte(d1, 12))[2:].zfill(16)

        for i in range(0, cell_count):
            json["cells"][f"{i+1}"] = {
                "voltage": _byte(d2, i * 2) / 1000,
                "balancing": int(balancing[31 - i]),
            }

        return json

    def send_message(self, message):
        if self.is_connected():
            try:
                mos_template = "DD 5A E1 02 00 ## ?? ?? 77"
                label = message.get_label()
                if "mos-state" in label:
                    bits = label.split("-")[2]
                    text = mos_template
                    if bits not in ["00", "01", "10", "11"]:
                        return False
                    text = text.replace("##", hex(3 - int(bits, 2))[2:].zfill(2))
                    current_bytes = bytes.fromhex(text[6:-9])
                    byte_sum = sum(current_bytes)
                    text = text.replace("?? ??", hex(256 * 256 - byte_sum)[2:])
                    self.connection.write(bytes.fromhex(text))
                    # TODO: Read answer from device and detect return state.
                    return True
            except SerialException:
                pass
