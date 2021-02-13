#define LENGTH 20

void setup() {
  Serial.begin(9600);
  Serial.println("Ready to read");
}

void loop() {
  if (Serial.available()) {
    char buffer[LENGTH];
    int index = 0;
    bool receiving = true;
    
    while (receiving) {
      if (Serial.available()) {
        char ch = Serial.read();
        if (ch == '\n' || ch == '\0') {
          buffer[index] = '\0';
          receiving = false;
        } else {
          buffer[index++] = ch;
          if (index == LENGTH) {
            buffer[index] = '\0';
            break;
          }
        }
      }
    }

    Serial.println(buffer);
  }
}
