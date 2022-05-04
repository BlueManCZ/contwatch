/*
  Serial LED controller

  Listens for messages on Serial port and accordingly controls LED array.
  In this example, 5 LEDs are connected one by one on pins 2-6.

  Examples of serial messages:

  1. Turn on LED number 4: {"type": "event", "label": "led_on", "payload": [4]}
  2. Turn off LED number 4: {"type": "event", "label": "led_off", "payload": [4]}
  3. Turn on all LEDs: {"type": "event", "label": "all_leds_on"}
  4. Turn off all LEDs: {"type": "event", "label": "all_leds_off"}
*/

#include <ArduinoJson.h>

void setup() {
  for (int i = 2; i < 7; i++) {
    pinMode(i, OUTPUT);
  }

  Serial.begin(9600);
}

void all_leds(uint8_t status) {
  for (int i = 2; i < 7; i++) {
    digitalWrite(i, status);
  }
}

void loop() {
  if (Serial.available()) {
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, Serial);
    if (!strcmp(doc["type"], "event")) {
      if (!strcmp(doc["label"], "led_on") || !strcmp(doc["label"], "led_off")) {
        digitalWrite(doc["payload"][0].as<int>() + 1, (strcmp(doc["label"], "led_off")) ? HIGH : LOW);
      } else if (!strcmp(doc["label"], "all_leds_on")) {
        all_leds(HIGH);
      } else if (!strcmp(doc["label"], "all_leds_off")) {
        all_leds(LOW);
      }
    }
  }
}
