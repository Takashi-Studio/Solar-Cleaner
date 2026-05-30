#include <AccelStepper.h>

// --- تعريف التوصيلات ومنافذ الأردوينو ميقا ---

// محرك الستيبر الأول (الجانب الأيسر للذراع) - توصيل 4 أسلاك للـ ULN2003
#define PIN_IN1_1 2
#define PIN_IN2_1 3
#define PIN_IN3_1 4
#define PIN_IN4_1 5

// محرك الستيبر الثاني (الجانب الأيمن للذراع) - توصيل 4 أسلاك للـ ULN2003
#define PIN_IN1_2 6
#define PIN_IN2_2 11
#define PIN_IN3_2 12
#define PIN_IN4_2 13

// حساس المسافة لقياس الخزان (Ultrasonic Sensor HC-SR04)
#define TRIG_PIN 7
#define ECHO_PIN 8

// ريلي مضخة المياه 12 فولت
#define PUMP_RELAY_PIN 9

// مفتاح نهاية الشوط (Limit Switch)
#define LIMIT_SWITCH_PIN 10

// --- إعدادات المحركات والحركة ---
// تعريف نمط الـ Halfstep (8 خطوات) لتشغيل محركات 28BYJ-48 بنعومة فائقة وعزم قوي
#define HALFSTEP 8

// تهيئة المحركين بنمط 4 أسلاك بالترتيب القياسي الصحيح لـ AccelStepper (IN1, IN3, IN2, IN4)
AccelStepper stepper1(HALFSTEP, PIN_IN1_1, PIN_IN3_1, PIN_IN2_1, PIN_IN4_1);
AccelStepper stepper2(HALFSTEP, PIN_IN1_2, PIN_IN3_2, PIN_IN2_2, PIN_IN4_2);

// سرعة وتسارع المحركات (محركات 28BYJ-48 تحتوي على تروس تخفيض لذا تعمل بكفاءة في سرعات متوسطة)
const float MAX_SPEED = 800.0;     // أقصى سرعة (خطوة في الثانية)
const float ACCELERATION = 400.0;  // التسارع
const long MAX_CLEANING_STEPS = 80000; // حد أمان للخطوات (بما أن المحرك يحتاج 4096 خطوة للدورة الكاملة)

// --- إعدادات الخزان ---
const int TANK_EMPTY_DISTANCE = 100; // مسافة الحساس بالسنتمتر عندما يكون الخزان فارغاً تماماً
const int TANK_FULL_DISTANCE = 10;  // مسافة الحساس بالسنتمتر عندما يكون الخزان ممتلئاً تماماً
const int MIN_WATER_PERCENT = 15;   // الحد الأدنى المسموح به للماء لبدء التنظيف

// --- حالات النظام (System States) ---
enum SystemState {
  IDLE,
  MOVING_FORWARD,
  MOVING_BACKWARD,
  SAFETY_STOP
};

SystemState currentState = IDLE;
long stepsTraveled = 0; // لحفظ عدد الخطوات المقطوعة ذهاباً

// توقيت قراءة الحساس وإرساله سحابياً (كل 10 ثوانٍ)
unsigned long lastWaterCheck = 0;
const unsigned long WATER_CHECK_INTERVAL = 10000; 

void setup() {
  // منفذ Serial0 للكمبيوتر الشخصي للـ Debugging
  Serial.begin(115200);
  
  // منفذ Serial1 المتصل بـ ESP-01 (منفذ 19 لـ RX1، ومنفذ 18 لـ TX1)
  Serial1.begin(115200);

  // إعداد منافذ الحساسات والمضخة
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(PUMP_RELAY_PIN, OUTPUT);
  digitalWrite(PUMP_RELAY_PIN, LOW); // إغلاق المضخة كحالة افتراضية

  // إعداد مفتاح نهاية الشوط بمقاومة سحب داخلية (INPUT_PULLUP)
  // يقرأ LOW عندما يتم ضغطه (يتصل بالـ GND)
  pinMode(LIMIT_SWITCH_PIN, INPUT_PULLUP);

  // إعداد تهيئة المحركات
  stepper1.setMaxSpeed(MAX_SPEED);
  stepper1.setAcceleration(ACCELERATION);
  stepper2.setMaxSpeed(MAX_SPEED);
  stepper2.setAcceleration(ACCELERATION);

  Serial.println("Arduino Mega 2560 initialized. Ready.");
}

void loop() {
  // 1. معالجة أوامر الـ Serial المستلمة من الـ ESP-01 المبرمجة
  handleSerialCommands();

  // 2. تحديث حركة محركات الستيبر باستمرار
  updateStepperMotors();

  // 3. قراءة وإرسال مستوى المياه بانتظام
  unsigned long currentMillis = millis();
  if (currentMillis - lastWaterCheck >= WATER_CHECK_INTERVAL) {
    lastWaterCheck = currentMillis;
    int waterPercent = measureWaterLevel();
    
    // إرسال النسبة للـ ESP-01 لتقوم بنشرها عبر MQTT
    Serial1.print("W:");
    Serial1.println(waterPercent);
    
    // طباعة للـ Debugging المحلي
    Serial.print("Debug: Water Level: ");
    Serial.print(waterPercent);
    Serial.println("%");
  }
}

// دالة قراءة ومعالجة الأوامر من ESP-01
void handleSerialCommands() {
  if (Serial1.available()) {
    String incoming = Serial1.readStringUntil('\n');
    incoming.trim();

    Serial.print("Received from ESP-01: ");
    Serial.println(incoming);

    // التحقق من صلاحية الأمر الموجه من السيرفر (يبدأ بـ C:)
    if (incoming.startsWith("C:")) {
      String command = incoming.substring(2);
      
      if (command == "START_CLEAN" && currentState == IDLE) {
        // التحقق من الماء أولاً قبل البدء
        int currentWater = measureWaterLevel();
        if (currentWater < MIN_WATER_PERCENT) {
          Serial.println("Safety: Water is too low to clean!");
          Serial1.println("S:WATER_LOW");
        } else {
          startCleaningCycle();
        }
      } 
      else if (command == "STOP_CLEAN") {
        stopEverything();
        Serial1.println("S:STOPPED");
      }
    }
  }
}

// دالة بدء دورة التنظيف والتحرك للأمام
void startCleaningCycle() {
  Serial.println("Starting cleaning cycle...");
  Serial1.println("S:CLEANING");
  
  // تشغيل مضخة المياه
  digitalWrite(PUMP_RELAY_PIN, HIGH);
  
  // تصفير المواضع الحالية للمحركات
  stepper1.setCurrentPosition(0);
  stepper2.setCurrentPosition(0);
  
  // تعيين هدف للتحرك للأمام بمسافة أمان قصوى
  stepper1.moveTo(MAX_CLEANING_STEPS);
  stepper2.moveTo(MAX_CLEANING_STEPS);
  
  currentState = MOVING_FORWARD;
}

// دالة تحديث الحركة وإدارة الـ State Machine للمحركات
void updateStepperMotors() {
  if (currentState == IDLE) return;

  if (currentState == MOVING_FORWARD) {
    // التحقق من ملامسة الـ Limit Switch (يقرأ LOW عند الملامسة)
    if (digitalRead(LIMIT_SWITCH_PIN) == LOW) {
      Serial.println("Limit switch triggered! Reversing direction...");
      
      // إيقاف المحركات فوراً وحفظ المسافة التي قطعتها
      stepsTraveled = stepper1.currentPosition();
      
      // عكس الوجهة للرجوع لنقطة الصفر البدئية
      stepper1.moveTo(0);
      stepper2.moveTo(0);
      
      currentState = MOVING_BACKWARD;
    } 
    // فحص حد الأمان الأقصى لمنع استمرار الدوران للأبد
    else if (stepper1.distanceToGo() == 0) {
      Serial.println("Safety warning: Limit switch not hit but max steps reached. Returning.");
      stepper1.moveTo(0);
      stepper2.moveTo(0);
      currentState = MOVING_BACKWARD;
    }
    
    // تشغيل خطوة للمحركات
    stepper1.run();
    stepper2.run();
  } 
  
  else if (currentState == MOVING_BACKWARD) {
    // التحقق من وصول المحركات للوضع الصفر (بداية اللوح)
    if (stepper1.distanceToGo() == 0) {
      Serial.println("Cleaning cycle completed successfully!");
      stopEverything(); // إطفاء المضخة
      Serial1.println("S:CLEANING_DONE");
      currentState = IDLE;
    } else {
      // الاستمرار في التحرك للخلف
      stepper1.run();
      stepper2.run();
    }
  }
}

// إيقاف المضخة والمحركات فوراً
void stopEverything() {
  digitalWrite(PUMP_RELAY_PIN, LOW); // إيقاف المضخة
  stepper1.stop();
  stepper2.stop();
  currentState = IDLE;
  Serial.println("Emergency or regular stop executed.");
}

// دالة حساب وقراءة مستوى مياه الخزان ونسبته المئوية
int measureWaterLevel() {
  // إرسال نبضة الموجات فوق الصوتية
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  // حساب زمن رجوع النبضة بالمايكرو ثانية
  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout
  
  // حساب المسافة بالسنتمتر
  int distance = duration * 0.034 / 2;

  // التحقق من قراءات الحساس الخاطئة أو الـ Out of range
  if (distance <= 0 || distance > TANK_EMPTY_DISTANCE) {
    distance = TANK_EMPTY_DISTANCE; 
  }

  // تحويل المسافة إلى نسبة مئوية (كلما زادت المسافة قل الماء)
  int waterLevelPercent = map(distance, TANK_FULL_DISTANCE, TANK_EMPTY_DISTANCE, 100, 0);
  
  // التأكد من أن النسبة تقع بين 0 و 100
  waterLevelPercent = constrain(waterLevelPercent, 0, 100);

  return waterLevelPercent;
}
