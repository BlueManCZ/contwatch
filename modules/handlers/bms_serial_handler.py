from time import sleep
from .serial_handler import SerialHandler


def _byte(array, index):
    return array[index] * 256 + array[index + 1]


class BmsSerialHandler(SerialHandler):
    """Class for handling Battery Management System connected to serial port."""

    type = "bms_serial"

    def _read_block(self, query):
        sleep(10)
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
        d1 = self._read_block(b"\xDD\xA5\x03\x00\xFF\xFD\x77")
        d2 = self._read_block(b"\xDD\xA5\x04\x00\xFF\xFC\x77")

        json = {
            "voltage": _byte(d1, 0) / 100,
            "current": _byte(d1, 2) / 100
            if _byte(d1, 2) < 2**15
            else (_byte(d1, 2) - 2**16) / 100,
            "capacity": _byte(d1, 4) * 10,
            "nominal-capacity": _byte(d1, 6) * 10,
            "cycles": _byte(d1, 8),
            "percentages": d1[19],
            "temperatures": {
                "1": (_byte(d1, 23) - 2731) / 10,
                "2": (_byte(d1, 25) - 2731) / 10,
            },
            "cell-voltages": {
                "1": _byte(d2, 0) / 1000,
                "2": _byte(d2, 2) / 1000,
                "3": _byte(d2, 4) / 1000,
                "4": _byte(d2, 6) / 1000,
                "5": _byte(d2, 8) / 1000,
                "6": _byte(d2, 10) / 1000,
                "7": _byte(d2, 12) / 1000,
                "8": _byte(d2, 14) / 1000,
                "9": _byte(d2, 16) / 1000,
                "10": _byte(d2, 18) / 1000,
            },
        }

        return json
