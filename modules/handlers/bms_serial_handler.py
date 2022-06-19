from .serial_handler import SerialHandler


def _byte(array, index):
    return array[index] * 256 + array[index + 1]


class BmsSerialHandler(SerialHandler):
    """Class for handling Battery Management System connected to serial port."""

    type = "bms_serial"

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
        return data

    def _read_message(self):
        d1 = self._read_block(b"\xDD\xA5\x03\x00\xFF\xFD\x77")
        d2 = self._read_block(b"\xDD\xA5\x04\x00\xFF\xFC\x77")

        json = {
            "voltage": _byte(d1, 0) / 100,
            "current": _byte(d1, 2),
            "capacity": _byte(d1, 4) * 10,
            "nominal-capacity": _byte(d1, 6) * 10,
            "cycles": _byte(d1, 8),
            "percentages": d1[19],
            "temperatures": {
                "1": _byte(d1, 23),
                "2": _byte(d1, 25),
            },
            "cell-voltages": {
                "1": _byte(d2, 0) / 100,
                "2": _byte(d2, 2) / 100,
                "3": _byte(d2, 4) / 100,
                "4": _byte(d2, 6) / 100,
                "5": _byte(d2, 8) / 100,
                "6": _byte(d2, 10) / 100,
                "7": _byte(d2, 12) / 100,
                "8": _byte(d2, 14) / 100,
                "9": _byte(d2, 16) / 100,
                "10": _byte(d2, 18) / 100,
            },
        }

        return json
