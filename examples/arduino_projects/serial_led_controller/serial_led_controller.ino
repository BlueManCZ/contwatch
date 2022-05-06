/*
  Serial LED controller

  Listens for messages on Serial port and accordingly controls LED array.
  In this example, 6 LEDs are connected one by one on pins 2-7.

  Examples of serial messages:

  1. Turn on LED 4: {"type": "event", "label": "led_on", "payload": [4]}
  2. Turn off LED 4: {"type": "event", "label": "led_off", "payload": [4]}
  3. Turn on all LEDs: {"type": "event", "label": "all_leds_on"}
  4. Turn off all LEDs: {"type": "event", "label": "all_leds_off"}
*/

#include <ArduinoJson.h>

void setup() {
  for (int i = 2; i < 8; i++) {
    pinMode(i, OUTPUT);
  }

  Serial.begin(9600);
}

void all_leds(int status) {
  for (int i = 2; i < 8; i++) {
    digitalWrite(i, status);
  }
}

void loop() {
  if (Serial.available()) {
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, Serial);
    const char *label = doc["label"];
    
    if (!strcmp(doc["type"], "event")) {
      if (!strcmp(label, "led_on") || !strcmp(label, "led_off")) {
        int status = strcmp(label, "led_off");
        digitalWrite(doc["payload"][0].as<int>() + 1, status);
      }
      
      if (!strcmp(label, "all_leds_on") || !strcmp(label, "all_leds_off")) {
        all_leds(strcmp(label, "all_leds_off"));
      }
    }
  }
}
