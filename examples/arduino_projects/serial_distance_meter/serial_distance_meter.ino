/*
  Serial distance meter

  Uses ultrasonic sensor HC-SR04 for distance
  measurement and writes result to the serial
  port in JSON format every second.
*/

#define echoPin 13
#define trigPin 12

long duration;
int distance;

void setup() {
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  
  duration = pulseIn(echoPin, HIGH, 100000);
  distance = duration * 0.034 / 2;
  
  Serial.print("{\"distance\": ");
  Serial.print(distance);
  Serial.println("}");
  
  delay(1000);
}
