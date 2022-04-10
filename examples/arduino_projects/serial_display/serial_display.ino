#include <ArduinoJson.h>
#include <LiquidCrystal.h>

LiquidCrystal lcd(8, 9, 4, 5, 6, 7);

void setup() {
  lcd.begin(16, 2);
  Serial.begin(9600);
}

void loop() {
  if (Serial.available()) {
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, Serial);
    if (!strcmp(doc["type"], "event")) {
      if (!strcmp(doc["label"], "display")) {
        lcd.clear();
        lcd.setCursor(0,0);
        lcd.print(doc["payload"][0].as<const char*>());
        lcd.setCursor(0,1);
        lcd.print(doc["payload"][1].as<const char*>());
      }
    }
  }
}
