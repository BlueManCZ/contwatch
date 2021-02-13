void setup() {
  Serial.begin(9600);
  Serial.println("Ready to read");
  Serial.println("Send \"Message,Data1,Data2,Data3\"\n");
}

void loop() {
  char* data[10];
  int count = getSerialData(data, Serial, ',', 20);

  if (count) {
    int index = 0;
    while (index < count) {
      Serial.print(index);
      Serial.print(": ");
      Serial.println(data[index++]);
    }
  }
}

int getSerialData(char* dataArray[], Stream &serial, char divider, int maxWordLenght) {
  int arrayIndex = 0;

  if (serial.available()) {
    char ch;
    char* part = new char[maxWordLenght];
    int index = 0;
    bool receiving = true;
    while (receiving) {
      if (serial.available()) {
        ch = serial.read();
        if (ch == divider || ch == '\n' || ch == '\0') {
          part[index] = '\0';
          dataArray[arrayIndex++] = part;
          part = new char[maxWordLenght];
          index = 0;
          if (ch == '\n' || ch == '\0') {
            receiving = false;
          }
        } else {
          part[index++] = ch;
        }
      }
    }

    delete part; // This is important to do. Arduino doesn't have garbage collector.
  }

  return arrayIndex;
}
