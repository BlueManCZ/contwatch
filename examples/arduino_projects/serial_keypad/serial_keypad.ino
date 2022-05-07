/*
  Serial keypad

  Uses 4x4 keypad and writes keyboard
  events to the Serial port in JSON format.
*/

#include <ArduinoJson.h>
#include <Keypad.h>

char keys[4][4] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};

byte pin_rows[4] = {9, 8, 7, 6};
byte pin_column[4] = {5, 4, 3, 2};

Keypad keypad = Keypad(makeKeymap(keys), pin_rows, pin_column, 4, 4);

void setup(){
  Serial.begin(9600);
  keypad.addEventListener(keypadEvent);
}

void loop(){
  char key = keypad.getKey();
}

void keypadEvent(KeypadEvent key){
  switch (keypad.getState()){
    case PRESSED:
    case RELEASED:
      DynamicJsonDocument event(512);
      int state = keypad.getState();
      event["type"] = "event";
      event["label"] = state == PRESSED ? "key_press" : "key_release";
      event["payload"][0] = String(key);
      event["payload"][1] = String(state == PRESSED);
      char buffer[512];
      serializeJson(event, buffer);
      Serial.println(buffer);
  }
}
