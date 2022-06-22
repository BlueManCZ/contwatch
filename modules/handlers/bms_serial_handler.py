from serial import SerialException
from .serial_handler import SerialHandler


def _byte(array, index):
    return array[index] * 256 + array[index + 1]


class BmsSerialHandler(SerialHandler):
    """Class for handling Jiabaida Battery Management System V4 connected to serial port."""

    type = "bms_serial"
    icon = type
    name = "Jiabaida BMS V4"

    def _read_block(self, query):
        self.connection.write(query)
        data = []
        length = 0
        for i in range(0, 11):
            byte = int.from_bytes(self.connection.read(), "big")
            if i == 9:
                if byte != 0:
                    break
            if i == 10:
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
        )

        json = {
            "voltage": _byte(d1, 0) / 100,
            "current": current,
            "capacity": _byte(d1, 4) * 10,
            "nominal-capacity": _byte(d1, 6) * 10,
            "cycles": _byte(d1, 8),
            "percentages": d1[19],
            "mos-state": d1[20],
            "temperatures": {
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
