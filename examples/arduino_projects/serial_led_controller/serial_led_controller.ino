void setup() {
  for (int i = 2; i < 7; i++) {
    pinMode(i, OUTPUT);
  }
  
  Serial.begin(9600);
  Serial.println("Ready to read");
  Serial.println("Send \"LED,[ON/OFF],[([1-6],)*/ALL]\"\n");
}

void loop() {
  char* data[10];
  int count = getSerialData(data, Serial, ',', 20);

  if (count) {
    int index = 0;
    while (index < count) {
      Serial.println(data[index++]);
    }
    
    if (!strcmp(data[0], "LED")) {
      index = 2;
      if (!strcmp(data[1], "ON") || !strcmp(data[1], "OFF")) {
        while (index < count) {
          if (!strcmp(data[index], "ALL")) {
            for (int i = 2; i < 7; i++) {
              digitalWrite(i, (strcmp(data[1], "OFF")) ? HIGH : LOW);
            }
            break;
          }
          digitalWrite(atoi(data[index++]) + 1, (strcmp(data[1], "OFF")) ? HIGH : LOW);
        }
      }
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
        ch = toupper(serial.read());
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
