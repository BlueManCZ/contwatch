/*
  Serial LED controller

  Listens for messages on Serial port and controls LED array.

  Examples of serial messages:

  1. Turn on LED number 4: {"type": "event", "label": "led_on", "payload": [4]}
  2. Turn off LED number 4: {"type": "event", "label": "led_off", "payload": [4]}
*/

#include <ArduinoJson.h>

void setup() {
  for (int i = 2; i < 7; i++) {
    pinMode(i, OUTPUT);
  }

  Serial.begin(9600);
}

void loop() {
  if (Serial.available()) {
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, Serial);
    if (!strcmp(doc["type"], "event")) {
      if (!strcmp(doc["label"], "led_on") || !strcmp(doc["label"], "led_off")) {
        digitalWrite(doc["payload"][0].as<int>() + 1, (strcmp(doc["label"], "led_off")) ? HIGH : LOW);
      }
    }
  }
}
