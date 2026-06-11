// --- تعريف التوصيلات ومنافذ التحكم بمحركات الـ DC (L298N) ---

// المحرك الأول (الجانب الأيسر للذراع)
#define MOTOR1_IN1 2
#define MOTOR1_IN2 3
#define MOTOR1_ENA 6   // منفذ PWM للتحكم بسرع المحرك الأول (أزل الجمبر الأسود)

// المحرك الثاني (الجانب الأيمن للذراع)
#define MOTOR2_IN3 4
#define MOTOR2_IN4 5
#define MOTOR2_ENB 11  // منفذ PWM للتحكم بسرع المحرك الثاني (أزل الجمبر الأسود)

// سرعة المحركات (من 0 إلى 255) - القيمة 50 تعني سرعة منخفضة جداً
const int MOTOR_SPEED = 30;

// حساس المسافة لقياس الخزان (Ultrasonic Sensor HC-SR04)
#define TRIG_PIN 7
#define ECHO_PIN 8

// ريلي مضخة المياه 12 فولت (Active-Low)
#define PUMP_RELAY_PIN 9

// مفتاح نهاية الشوط (Limit Switch)
#define LIMIT_SWITCH_PIN 10

// --- إعدادات الخزان والأمان ---
const int TANK_EMPTY_DISTANCE = 100; // مسافة الحساس بالسنتمتر عندما يكون الخزان فارغاً تماماً
const int TANK_FULL_DISTANCE = 10;  // مسافة الحساس بالسنتمتر عندما يكون الخزان ممتلئاً تماماً
const int MIN_WATER_PERCENT = 15;   // الحد الأدنى المسموح به للماء لبدء التنظيف

// --- متغيرات تتبع الوقت والحركة ---
unsigned long cleaningStartTime = 0; // وقت بدء حركة الذهاب للأمام
unsigned long travelTime = 0;        // الوقت الفعلي المستغرق للوصول للمفتاح
unsigned long backwardStartTime = 0; // وقت بدء حركة العودة للخلف
const unsigned long MAX_CLEANING_TIME = 20000; // حد أمان أقصى (20 ثانية) للحركة للأمام قبل العودة تلقائياً

// --- حالات النظام (System States) ---
enum SystemState {
  IDLE,
  MOVING_FORWARD,
  MOVING_BACKWARD,
  SAFETY_STOP
};

SystemState currentState = IDLE;

// توقيت قراءة الحساس وإرساله سحابياً (كل 10 ثوانٍ)
unsigned long lastWaterCheck = 0;
const unsigned long WATER_CHECK_INTERVAL = 10000; 

void setup() {
  // منفذ Serial0 للكمبيوتر الشخصي للـ Debugging
  Serial.begin(115200);
  
  // منفذ Serial1 المتصل بـ ESP-01 (منفذ 19 لـ RX1، ومنفذ 18 لـ TX1)
  Serial1.begin(115200);

  // إعداد منافذ محركات الـ DC كـ مخارج
  pinMode(MOTOR1_IN1, OUTPUT);
  pinMode(MOTOR1_IN2, OUTPUT);
  pinMode(MOTOR1_ENA, OUTPUT);
  pinMode(MOTOR2_IN3, OUTPUT);
  pinMode(MOTOR2_IN4, OUTPUT);
  pinMode(MOTOR2_ENB, OUTPUT);

  // إيقاف المحركات كحالة افتراضية
  stopMotors();

  // إعداد منافذ الحساسات والمضخة
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  
  // إغلاق المضخة كحالة افتراضية (مستوى HIGH يعادل إيقاف في ريلي Active-Low)
  digitalWrite(PUMP_RELAY_PIN, HIGH);
  pinMode(PUMP_RELAY_PIN, OUTPUT);

  // إعداد مفتاح نهاية الشوط بمقاومة سحب داخلية (INPUT_PULLUP)
  // يقرأ LOW عندما يتم ضغطه (يتصل بالـ GND)
  pinMode(LIMIT_SWITCH_PIN, INPUT_PULLUP);

  Serial.println("Arduino Mega 2560 initialized. Ready.");
}

void loop() {
  // 1. معالجة أوامر الـ Serial المستلمة من الـ ESP-01 المبرمجة أو شاشة مراقبة الكمبيوتر
  handleSerialCommands();

  // 2. تحديث حركة محركات الـ DC وإدارة مسار الذراع
  updateMotors();

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

// دالة معالجة الأمر المستلم
void processCommand(String incoming, bool fromESP) {
  if (fromESP) {
    Serial.print("Received from ESP-01: ");
    Serial.println(incoming);
  } else {
    Serial.print("Received from USB Serial Monitor: ");
    Serial.println(incoming);
  }

  // التحقق من صلاحية الأمر الموجه (يبدأ بـ C:)
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

// دالة قراءة ومعالجة الأوامر من ESP-01 وشاشة المراقبة للكمبيوتر
void handleSerialCommands() {
  // 1. استقبال الأوامر من قطعة الشبكة ESP-01
  if (Serial1.available()) {
    String incoming = Serial1.readStringUntil('\n');
    incoming.trim();
    processCommand(incoming, true);
  }

  // 2. استقبال الأوامر من شاشة مراقبة الكمبيوتر (USB) للتجريب المباشر
  if (Serial.available()) {
    String incoming = Serial.readStringUntil('\n');
    incoming.trim();
    processCommand(incoming, false);
  }
}

// دالة بدء دورة التنظيف والتحرك للأمام
void startCleaningCycle() {
  Serial.println("Starting cleaning cycle...");
  Serial1.println("S:CLEANING");
  
  // تشغيل مضخة المياه (Active-Low)
  digitalWrite(PUMP_RELAY_PIN, LOW);
  
  // تشغيل المحركات للتحرك للأمام
  moveMotorsForward();
  
  cleaningStartTime = millis();
  currentState = MOVING_FORWARD;
}

// دالة تحديث الحركة وإدارة المحركات بناء على نهاية الشوط أو الوقت
void updateMotors() {
  if (currentState == IDLE) return;

  unsigned long currentMillis = millis();

  if (currentState == MOVING_FORWARD) {
    // التحقق من ملامسة الـ Limit Switch (يقرأ LOW عند الملامسة)
    if (digitalRead(LIMIT_SWITCH_PIN) == LOW) {
      Serial.println("Limit switch triggered! Reversing direction...");
      
      // حساب الوقت المستغرق ذهاباً
      travelTime = currentMillis - cleaningStartTime;
      
      // عكس الدوران للرجوع للخلف
      moveMotorsBackward();
      
      backwardStartTime = currentMillis;
      currentState = MOVING_BACKWARD;
    } 
    // فحص حد الأمان الأقصى للوقت لمنع استمرار الدوران للأبد في حال عدم تفعيل الحساس
    else if (currentMillis - cleaningStartTime >= MAX_CLEANING_TIME) {
      Serial.println("Safety warning: Limit switch not hit but max time reached. Returning.");
      
      travelTime = MAX_CLEANING_TIME;
      moveMotorsBackward();
      
      backwardStartTime = currentMillis;
      currentState = MOVING_BACKWARD;
    }
  } 
  
  else if (currentState == MOVING_BACKWARD) {
    // التحقق من انتهاء زمن العودة للخلف (يساوي تماماً زمن الذهاب)
    if (currentMillis - backwardStartTime >= travelTime) {
      Serial.println("Cleaning cycle completed successfully!");
      stopEverything(); // إطفاء المضخة والمحركات
      Serial1.println("S:CLEANING_DONE");
      currentState = IDLE;
    }
  }
}

// دالة إيقاف المضخة والمحركات فوراً
void stopEverything() {
  digitalWrite(PUMP_RELAY_PIN, HIGH); // إيقاف المضخة (Active-Low)
  stopMotors(); // إيقاف المحركات
  currentState = IDLE;
  Serial.println("Emergency or regular stop executed.");
}

// دالة التحكم بحركة المحركات للأمام مع ضبط السرعة (تم عكس اتجاه المحرك الثاني)
void moveMotorsForward() {
  analogWrite(MOTOR1_ENA, MOTOR_SPEED);
  digitalWrite(MOTOR1_IN1, HIGH);
  digitalWrite(MOTOR1_IN2, LOW);
  
  analogWrite(MOTOR2_ENB, MOTOR_SPEED);
  digitalWrite(MOTOR2_IN3, LOW);  // تم العكس
  digitalWrite(MOTOR2_IN4, HIGH); // تم العكس
}

// دالة التحكم بحركة المحركات للخلف مع ضبط السرعة (تم عكس اتجاه المحرك الثاني)
void moveMotorsBackward() {
  analogWrite(MOTOR1_ENA, MOTOR_SPEED);
  digitalWrite(MOTOR1_IN1, LOW);
  digitalWrite(MOTOR1_IN2, HIGH);
  
  analogWrite(MOTOR2_ENB, MOTOR_SPEED);
  digitalWrite(MOTOR2_IN3, HIGH); // تم العكس
  digitalWrite(MOTOR2_IN4, LOW);  // تم العكس
}

// دالة إيقاف المحركات تماماً
void stopMotors() {
  analogWrite(MOTOR1_ENA, 0);
  digitalWrite(MOTOR1_IN1, LOW);
  digitalWrite(MOTOR1_IN2, LOW);
  
  analogWrite(MOTOR2_ENB, 0);
  digitalWrite(MOTOR2_IN3, LOW);
  digitalWrite(MOTOR2_IN4, LOW);
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
