// =================================================================
//     نظام تنظيف الألواح الشمسية - أردوينو ميجا 2560
//     بروتوكول الاتصال: JSON عبر Serial1 (ESP-01)
// =================================================================

#define CONTROLLER_ID "ARD-MEGA-001"  // معرّف المتحكم الفريد - يُغيَّر لكل وحدة مركبة

// =================================================================
//     منافذ التحكم بالسرعة (PWM Pins) - مجموعة في البداية
// =================================================================
#define DEV1_ENA 2
#define DEV1_ENB 3
#define DEV2_ENA 4
#define DEV2_ENB 5
#define DEV3_ENA 6
#define DEV3_ENB 7
#define DEV4_ENA 8
#define DEV4_ENB 9

// =================================================================
//     كتل وحدات التنظيف المتتالية (Contiguous Unit Blocks)
// =================================================================

// --- وحدة التنظيف 1 (Cleaning Unit 1) ---
#define DEV1_IN1        22
#define DEV1_IN2        23
#define DEV1_IN3        24
#define DEV1_IN4        25
#define DEV1_TRIG       26
#define DEV1_ECHO       27
#define DEV1_L_START    28
#define DEV1_L_END      29
#define DEV1_PUMP       30

// --- وحدة التنظيف 2 (Cleaning Unit 2) ---
#define DEV2_IN1        31
#define DEV2_IN2        32
#define DEV2_IN3        33
#define DEV2_IN4        34
#define DEV2_TRIG       35
#define DEV2_ECHO       36
#define DEV2_L_START    37
#define DEV2_L_END      38
#define DEV2_PUMP       39

// --- وحدة التنظيف 3 (Cleaning Unit 3) ---
#define DEV3_IN1        40
#define DEV3_IN2        41
#define DEV3_IN3        42
#define DEV3_IN4        43
#define DEV3_TRIG       44
#define DEV3_ECHO       45
#define DEV3_L_START    46
#define DEV3_L_END      47
#define DEV3_PUMP       48

// --- وحدة التنظيف 4 (Cleaning Unit 4) ---
#define DEV4_IN1        49
#define DEV4_IN2        50
#define DEV4_IN3        51
#define DEV4_IN4        52
#define DEV4_TRIG       53
#define DEV4_ECHO       54   // المنافذ التناظرية كرقمية (A0 تعادل 54)
#define DEV4_L_START    55   // (A1 تعادل 55)
#define DEV4_L_END      56   // (A2 تعادل 56)
#define DEV4_PUMP       57   // (A3 تعادل 57)

// =================================================================
//     إعدادات الأمان وقيم التحكم الثابتة
// =================================================================
const int TANK_EMPTY_DISTANCE           = 100;   // مسافة الخزان فارغاً (سم)
const int TANK_FULL_DISTANCE            = 10;    // مسافة الخزان ممتلئاً (سم)
const int MIN_WATER_PERCENT             = 15;    // الحد الأدنى للماء لبدء التنظيف (%)
const int MOTOR_SPEED                   = 50;    // سرعة المحركات الثابتة (0-255)
const unsigned long MAX_CLEANING_TIME   = 20000; // حد الأمان الزمني بالمللي ثانية (20 ثانية)
const unsigned long WATER_CHECK_INTERVAL = 10000; // فترة إرسال مستوى الماء عند الاستعداد (10 ثوانٍ)

// =================================================================
//     تعريفات الحالة والهياكل البرمجية
// =================================================================
enum SystemState {
  IDLE,
  PRE_PUMP,        // رش الماء المبدئي (5 ثوانٍ)
  PRE_DELAY,       // فترة الأمان والانتظار (3 ثوانٍ)
  MOVING_FORWARD,  // حركة المحركات للأمام
  MOVING_BACKWARD  // حركة المحركات للخلف للعودة للبداية
};

// هيكل بيانات وحدة التنظيف (يتطابق مع جدول CleaningUnit في قاعدة البيانات)
struct CleaningUnit {
  int id;               // رقم المنفذ (port_number) من 1 إلى 4
  bool isInstalled;     // هل الوحدة موصلة فيزيائياً؟ (is_installed)

  // منافذ الهاردوير
  int pinENA, pinENB;
  int pinIN1, pinIN2, pinIN3, pinIN4;
  int pinTrig, pinEcho;
  int pinLimitStart, pinLimitEnd;
  int pinPumpRelay;   // ريلاي عادي - يعمل بـ HIGH/LOW فقط

  // متغيرات الحالة
  SystemState currentState;
  unsigned long movementStartTime;
  bool gracefulStop;    // true = يعود للبداية بعد إيقاف طارئ (بدون مضخة)
  
  // متغيرات الدورة المخصصة
  int currentCycle;             // 1 أو 2 لدورة التنظيف المزدوجة، أو 0 للفحص اليدوي
  unsigned long stateStartTime; // لحساب أزمنة رش الماء والانتظار
};

// تهيئة مصفوفة الوحدات الأربع بالترتيب ومنافذها
CleaningUnit units[4] = {
  {1, false, DEV1_ENA, DEV1_ENB, DEV1_IN1, DEV1_IN2, DEV1_IN3, DEV1_IN4, DEV1_TRIG, DEV1_ECHO, DEV1_L_START, DEV1_L_END, DEV1_PUMP, IDLE, 0, false, 0, 0},
  {2, false, DEV2_ENA, DEV2_ENB, DEV2_IN1, DEV2_IN2, DEV2_IN3, DEV2_IN4, DEV2_TRIG, DEV2_ECHO, DEV2_L_START, DEV2_L_END, DEV2_PUMP, IDLE, 0, false, 0, 0},
  {3, false, DEV3_ENA, DEV3_ENB, DEV3_IN1, DEV3_IN2, DEV3_IN3, DEV3_IN4, DEV3_TRIG, DEV3_ECHO, DEV3_L_START, DEV3_L_END, DEV3_PUMP, IDLE, 0, false, 0, 0},
  {4, false, DEV4_ENA, DEV4_ENB, DEV4_IN1, DEV4_IN2, DEV4_IN3, DEV4_IN4, DEV4_TRIG, DEV4_ECHO, DEV4_L_START, DEV4_L_END, DEV4_PUMP, IDLE, 0, false, 0, 0}
};

unsigned long lastWaterCheck = 0;

// =================================================================
//     دوال بناء وإرسال رسائل JSON عبر Serial1 (ESP-01)
// =================================================================

// تقرير الإقلاع: يُرسل مرة واحدة عند التشغيل
// يخبر السيرفر بمعرّف المتحكم وأي وحدات تنظيف مركبة (Plug & Play)
// مثال: {"type":"boot","controller":"ARD-MEGA-001","units":[{"port":1,"installed":true},{"port":2,"installed":false},...]}
void sendBootReport() {
  String json = "{\"type\":\"boot\",\"controller\":\"";
  json += CONTROLLER_ID;
  json += "\",\"units\":[";
  for (int i = 0; i < 4; i++) {
    json += "{\"port\":";
    json += units[i].id;
    json += ",\"installed\":";
    json += units[i].isInstalled ? "true" : "false";
    json += "}";
    if (i < 3) json += ",";
  }
  json += "]}";
  Serial1.println(json);
  Serial.println("[BOOT] Report sent: " + json);
}

// إرسال مستوى الماء لوحدة محددة
// مثال: {"type":"water","controller":"ARD-MEGA-001","port":1,"level":85}
void sendWaterLevel(CleaningUnit &unit, int level) {
  String json = "{\"type\":\"water\",\"controller\":\"";
  json += CONTROLLER_ID;
  json += "\",\"port\":";
  json += unit.id;
  json += ",\"level\":";
  json += level;
  json += "}";
  Serial1.println(json);
  // تم إيقاف الطباعة اللحظية في شاشة المراقبة لتفادي كثرة الرسائل، مع إرسالها للسيرفر بشكل طبيعي
  // Serial.print("[WATER] Unit "); Serial.print(unit.id);
  // Serial.print(" -> "); Serial.print(level); Serial.println("%");
}

// إرسال تحديث حالة وحدة محددة
// مثال: {"type":"status","controller":"ARD-MEGA-001","port":1,"state":"CLEANING"}
// الحالات الممكنة: IDLE | CLEANING | CLEANING_DONE | STOPPED | WATER_LOW | SENSOR_ERR | LIMIT_SWITCH_ERROR | OFFLINE
void sendStatusUpdate(CleaningUnit &unit, const char* state) {
  String json = "{\"type\":\"status\",\"controller\":\"";
  json += CONTROLLER_ID;
  json += "\",\"port\":";
  json += unit.id;
  json += ",\"state\":\"";
  json += state;
  json += "\"}";
  Serial1.println(json);
  Serial.print("[STATUS] Unit "); Serial.print(unit.id);
  Serial.print(" -> "); Serial.println(state);
}

// =================================================================
//     Setup
// =================================================================
void setup() {
  Serial.begin(115200);
  Serial1.begin(9600);

  Serial.println("[BOOT] Initializing system and auto-detecting units...");

  for (int i = 0; i < 4; i++) {
    CleaningUnit &unit = units[i];

    // إعداد منافذ المحركات
    pinMode(unit.pinENA,  OUTPUT);
    pinMode(unit.pinENB,  OUTPUT);
    pinMode(unit.pinIN1,  OUTPUT);
    pinMode(unit.pinIN2,  OUTPUT);
    pinMode(unit.pinIN3,  OUTPUT);
    pinMode(unit.pinIN4,  OUTPUT);
    stopUnitMotors(unit);

    // إعداد منافذ الحساس الصوتي
    pinMode(unit.pinTrig, OUTPUT);
    pinMode(unit.pinEcho, INPUT);

    // إعداد ريلاي المضخة (يجب تعيين الوضع قبل الكتابة)
    pinMode(unit.pinPumpRelay, OUTPUT);
    digitalWrite(unit.pinPumpRelay, HIGH); // إيقاف المضخة كحالة افتراضية (Active-Low)

    // إعداد مفاتيح نهاية الشوط (مربوطة للـ GND)
    pinMode(unit.pinLimitStart, INPUT_PULLUP);
    pinMode(unit.pinLimitEnd,   INPUT_PULLUP);

    // الكشف التلقائي عن الوحدة بقراءة الحساس (Plug & Play)
    bool sensorOk = false;
    measureWaterLevel(unit, sensorOk);
    unit.isInstalled = sensorOk;

    if (sensorOk) {
      Serial.print("[BOOT] Unit ["); Serial.print(unit.id); Serial.println("] CONNECTED.");
    } else {
      Serial.print("[BOOT] Unit ["); Serial.print(unit.id); Serial.println("] NOT CONNECTED (OFFLINE).");
    }
  }

  Serial.println("[BOOT] System ready. Sending boot report to server...");
  sendBootReport();
}

// =================================================================
//     Loop
// =================================================================
void loop() {
  // 1. معالجة الأوامر الواردة من السيرفر عبر ESP-01 أو USB
  handleSerialCommands();

  // 2. تحديث حركة المحركات لجميع الوحدات النشطة بالتوازي
  updateMotors();

  // 3. إرسال تقرير مستوى الماء لجميع الوحدات بشكل دوري
  unsigned long now = millis();
  unsigned long currentInterval = WATER_CHECK_INTERVAL;

  // إذا كانت أي وحدة قيد العمل أو الفحص، نقوم بتحديث مستوى المياه بسرعة أكبر (كل 3 ثوانٍ) لمتابعتها لحظياً
  for (int i = 0; i < 4; i++) {
    if (units[i].isInstalled && units[i].currentState != IDLE) {
      currentInterval = 3000;
      break;
    }
  }

  if (now - lastWaterCheck >= currentInterval) {
    lastWaterCheck = now;
    reportAllWaterLevels();
  }
}

// =================================================================
//     إرسال مستوى الماء لجميع الوحدات دفعة واحدة
// =================================================================
void reportAllWaterLevels() {
  for (int i = 0; i < 4; i++) {
    CleaningUnit &unit = units[i];
    if (unit.isInstalled) {
      bool sensorOk = false;
      int level = measureWaterLevel(unit, sensorOk);
      if (sensorOk) {
        sendWaterLevel(unit, level);
      } else {
        sendStatusUpdate(unit, "SENSOR_ERR");
      }
    } else {
      sendStatusUpdate(unit, "OFFLINE");
    }
  }
}

// =================================================================
//     معالجة الأوامر الواردة من السيرفر
//     تنسيق الأمر المتوقع (JSON):
//     {"cmd":"START_CLEAN","port":1}
//     {"cmd":"STOP_CLEAN","port":1}
// =================================================================
void handleSerialCommands() {
  if (Serial1.available()) {
    String incoming = Serial1.readStringUntil('\n');
    incoming.trim();
    if (incoming.length() > 0) processCommand(incoming);
  }
  if (Serial.available()) {
    String incoming = Serial.readStringUntil('\n');
    incoming.trim();
    if (incoming.length() > 0) processCommand(incoming);
  }
}

void processCommand(String incoming) {
  // تصفية وطباعة تنبيهات ورسائل قطعة الواي فاي الواردة
  if (incoming.startsWith("I:")) {
    Serial.print("[WiFi Info] ");
    Serial.println(incoming.substring(2));
    return;
  }
  if (incoming.startsWith("E:")) {
    Serial.print("[WiFi Error] ⚠️ ");
    Serial.println(incoming.substring(2));
    return;
  }
  if (incoming.startsWith("*wm:")) {
    Serial.print("[WiFi Setup] ");
    Serial.println(incoming.substring(4));
    return;
  }

  Serial.print("[CMD] Received: "); Serial.println(incoming);

  // استخراج قيمة "cmd"
  int cmdStart = incoming.indexOf("\"cmd\":\"") + 7;
  int cmdEnd   = incoming.indexOf("\"", cmdStart);

  if (cmdStart < 7 || cmdEnd <= cmdStart) {
    Serial.println("[CMD] Invalid or unrecognized JSON format. Ignored.");
    return;
  }

  String command = incoming.substring(cmdStart, cmdEnd);

  // أمر طلب تقرير الإقلاع والمزامنة من قطعة الواي فاي
  if (command == "GET_BOOT") {
    Serial.println("[CMD] Resending boot report...");
    sendBootReport();
    return;
  }

  // استخراج قيمة "port"
  int portStart = incoming.indexOf("\"port\":") + 7;
  // نقرأ حتى أول حرف غير رقمي
  int portEnd = portStart;
  while (portEnd < (int)incoming.length() && isDigit(incoming.charAt(portEnd))) portEnd++;

  if (portStart < 7 || portEnd <= portStart) {
    Serial.println("[CMD] Port number missing. Ignored.");
    return;
  }

  int    port    = incoming.substring(portStart, portEnd).toInt();

  if (port < 1 || port > 4) {
    Serial.println("[CMD] Invalid port number. Must be 1-4.");
    return;
  }

  handleUnitCommand(port - 1, command);
}

void handleUnitCommand(int idx, String command) {
  CleaningUnit &unit = units[idx];

  if (!unit.isInstalled) {
    Serial.print("[CMD] Ignored. Unit "); Serial.print(unit.id); Serial.println(" is not installed.");
    sendStatusUpdate(unit, "OFFLINE");
    return;
  }

  if (command == "START_CLEAN" && unit.currentState == IDLE) {
    bool sensorOk = false;
    int waterLevel = measureWaterLevel(unit, sensorOk);

    if (!sensorOk) {
      Serial.print("[SAFETY] Sensor error on unit "); Serial.println(unit.id);
      sendStatusUpdate(unit, "SENSOR_ERR");
    } else if (waterLevel < MIN_WATER_PERCENT) {
      Serial.print("[SAFETY] Water too low on unit "); Serial.print(unit.id);
      Serial.print(": "); Serial.print(waterLevel); Serial.println("%");
      sendStatusUpdate(unit, "WATER_LOW");
    } else {
      startCleaning(unit);
    }
  }
  else if (command == "STOP_CLEAN") {
    if (unit.currentState == IDLE) {
      // الجهاز متوقف أصلاً، لا شيء نفعله
      return;
    }

    // 1. إيقاف المضخة فوراً لحفظ الماء المتبقي
    digitalWrite(unit.pinPumpRelay, HIGH);

    if (unit.currentState == MOVING_FORWARD) {
      // إذا كان يتحرك للأمام: نعكس الاتجاه للعودة للبداية (بدون ماء)
      moveBackward(unit);
      unit.movementStartTime = millis();
      unit.currentState = MOVING_BACKWARD;
      Serial.print("[STOP] Unit "); Serial.print(unit.id); Serial.println(" -> Pump off, reversing to home.");
    } else {
      // إذا كان يعود أصلاً: نكمل العودة بدون مضخة
      Serial.print("[STOP] Unit "); Serial.print(unit.id); Serial.println(" -> Pump off, continuing home.");
    }

    // 2. تفعيل وضع الإيقاف الآمن (سيُرسل WATER_LOW بدلاً من CLEANING_DONE عند الوصول)
    unit.gracefulStop = true;
    sendStatusUpdate(unit, "RETURNING_HOME");
  }
  else if (command == "TEST_FWD") {
    // تشغيل المحرك للأمام بشكل فردي للفحص مع تفعيل أمان نهاية المسار
    stopUnitEverything(unit);
    unit.currentCycle = 0; // فحص يدوي
    moveForward(unit);
    unit.movementStartTime = millis();
    unit.currentState = MOVING_FORWARD;
    sendStatusUpdate(unit, "CLEANING");
    Serial.print("[TEST] Unit "); Serial.print(unit.id); Serial.println(" -> Test Forward started.");
  }
  else if (command == "TEST_BWD") {
    // تشغيل المحرك للخلف بشكل فردي للفحص مع تفعيل أمان بداية المسار
    stopUnitEverything(unit);
    unit.currentCycle = 0; // فحص يدوي
    moveBackward(unit);
    unit.movementStartTime = millis();
    unit.currentState = MOVING_BACKWARD;
    sendStatusUpdate(unit, "RETURNING_HOME");
    Serial.print("[TEST] Unit "); Serial.print(unit.id); Serial.println(" -> Test Backward started.");
  }
  else if (command == "TEST_PUMP") {
    // تشغيل المضخة بشكل فردي للفحص
    stopUnitEverything(unit);
    unit.currentCycle = 0; // فحص يدوي
    digitalWrite(unit.pinPumpRelay, LOW); // تشغيل ريلاي المضخة (Active-Low)
    unit.currentState = IDLE;
    sendStatusUpdate(unit, "TESTING_PUMP");
    Serial.print("[TEST] Unit "); Serial.print(unit.id); Serial.println(" -> Test Pump started.");
  }
  else if (command == "TEST_STOP" || command == "STOP") {
    // إيقاف كل شيء وإرجاع الوحدة لحالة الاستعداد
    stopUnitEverything(unit);
    unit.currentCycle = 0; // فحص يدوي
    unit.currentState = IDLE;
    sendStatusUpdate(unit, "IDLE");
    Serial.print("[TEST] Unit "); Serial.print(unit.id); Serial.println(" -> Test Stop (Everything Off).");
  }
  else {
    Serial.print("[CMD] Unknown command: "); Serial.println(command);
  }
}

// =================================================================
//     دوال التحكم بالوحدات
// =================================================================
void startCleaning(CleaningUnit &unit) {
  stopUnitEverything(unit);
  unit.currentCycle = 1;
  unit.currentState = PRE_PUMP;
  unit.stateStartTime = millis();
  digitalWrite(unit.pinPumpRelay, LOW);  // تشغيل المضخة (Active-Low)
  sendStatusUpdate(unit, "CLEANING");
  Serial.print("[CLEAN] Unit "); Serial.print(unit.id); Serial.println(" -> Started Cycle 1 (Water Pump 5s).");
}

void stopUnitEverything(CleaningUnit &unit) {
  digitalWrite(unit.pinPumpRelay, HIGH); // إيقاف المضخة
  stopUnitMotors(unit);
  unit.currentState = IDLE;
}

// =================================================================
//     تحديث حالة المحركات والمضخات لجميع الوحدات بالتوازي
// =================================================================
void updateMotors() {
  unsigned long now = millis();

  for (int i = 0; i < 4; i++) {
    CleaningUnit &unit = units[i];
    if (!unit.isInstalled || unit.currentState == IDLE) continue;

    if (unit.currentState == PRE_PUMP) {
      // 1. رش الماء أولاً لمدة 5 ثوانٍ
      if (now - unit.stateStartTime >= 5000) {
        digitalWrite(unit.pinPumpRelay, HIGH); // إيقاف الرش
        unit.currentState = PRE_DELAY;
        unit.stateStartTime = now;
        Serial.print("[SEQUENCE] Unit "); Serial.print(unit.id); Serial.println(" -> Pump off, starting 3s safety delay.");
      }
    }
    else if (unit.currentState == PRE_DELAY) {
      // 2. فترة أمان 3 ثوانٍ قبل بدء المحركات
      if (now - unit.stateStartTime >= 3000) {
        moveForward(unit); // تشغيل المحركات للأمام
        unit.movementStartTime = now;
        unit.currentState = MOVING_FORWARD;
        Serial.print("[SEQUENCE] Unit "); Serial.print(unit.id); Serial.print(" -> Moving forward (Cycle "); Serial.print(unit.currentCycle); Serial.println(").");
      }
    }
    else if (unit.currentState == MOVING_FORWARD) {
      // 3. الحركة للأمام حتى نهاية الشوط (تجاهل أول ثانيتين لتفادي التشويش الكهربائي)
      if (now - unit.movementStartTime >= 2000 && digitalRead(unit.pinLimitEnd) == LOW) {
        moveBackward(unit); // الرجوع للخلف
        unit.movementStartTime = now;
        unit.currentState = MOVING_BACKWARD;
        Serial.print("[SEQUENCE] Unit "); Serial.print(unit.id); Serial.println(" -> End reached. Reversing.");
      }
      else if (now - unit.movementStartTime >= MAX_CLEANING_TIME) {
        moveBackward(unit); // تجاوز الوقت الآمن - إرجاع إجباري
        unit.movementStartTime = now;
        unit.currentState = MOVING_BACKWARD;
        Serial.print("[WARN] Unit "); Serial.print(unit.id); Serial.println(" -> Forward timeout. Reversing.");
      }
    }
    else if (unit.currentState == MOVING_BACKWARD) {
      // 4. الحركة للخلف حتى بداية الشوط (تجاهل أول ثانيتين لتفادي التشويش الكهربائي)
      if (now - unit.movementStartTime >= 2000 && digitalRead(unit.pinLimitStart) == LOW) {
        stopUnitMotors(unit);
        
        if (unit.gracefulStop) {
          // العودة للبداية بعد إيقاف طارئ
          unit.gracefulStop = false;
          stopUnitEverything(unit);
          sendStatusUpdate(unit, "WATER_LOW");
          Serial.print("[SEQUENCE] Unit "); Serial.print(unit.id); Serial.println(" -> Home reached after emergency.");
        }
        else if (unit.currentCycle == 0) {
          // انتهاء الاختبار اليدوي الفردي بنجاح
          stopUnitEverything(unit);
          sendStatusUpdate(unit, "IDLE");
          Serial.print("[TEST] Unit "); Serial.print(unit.id); Serial.println(" -> Test finished at home.");
        }
        else if (unit.currentCycle == 1) {
          // انتهت الدورة الأولى، ابدأ الدورة الثانية (رش ماء ثانٍ)
          unit.currentCycle = 2;
          digitalWrite(unit.pinPumpRelay, LOW); // تشغيل الرش المرة الثانية
          unit.currentState = PRE_PUMP;
          unit.stateStartTime = now;
          Serial.print("[SEQUENCE] Unit "); Serial.print(unit.id); Serial.println(" -> Cycle 1 finished. Starting Cycle 2 (Pump 5s).");
        }
        else if (unit.currentCycle == 2) {
          // اكتملت دورتي التنظيف كاملتين
          stopUnitEverything(unit);
          sendStatusUpdate(unit, "CLEANING_DONE");
          Serial.print("[SEQUENCE] Unit "); Serial.print(unit.id); Serial.println(" -> Cycle 2 finished. Cleaning completed successfully!");
        }
      }
      else if (now - unit.movementStartTime >= MAX_CLEANING_TIME) {
        // تجاوز وقت الأمان في الرجوع - إيقاف طوارئ وخطأ
        unit.gracefulStop = false;
        stopUnitEverything(unit);
        sendStatusUpdate(unit, "LIMIT_SWITCH_ERROR");
        Serial.print("[ERROR] Unit "); Serial.print(unit.id); Serial.println(" -> Backward timeout. Emergency stop.");
      }
    }
  }
}

// =================================================================
//     دوال حركة المحركات لكل وحدة
// =================================================================
void moveForward(CleaningUnit &unit) {
  analogWrite(unit.pinENA,  MOTOR_SPEED);
  digitalWrite(unit.pinIN1, HIGH);
  digitalWrite(unit.pinIN2, LOW);

  analogWrite(unit.pinENB,  MOTOR_SPEED);
  digitalWrite(unit.pinIN3, HIGH);  // مطابقة اتجاه الدوران للجهتين برمجياً
  digitalWrite(unit.pinIN4, LOW);
}

void moveBackward(CleaningUnit &unit) {
  analogWrite(unit.pinENA,  MOTOR_SPEED);
  digitalWrite(unit.pinIN1, LOW);
  digitalWrite(unit.pinIN2, HIGH);

  analogWrite(unit.pinENB,  MOTOR_SPEED);
  digitalWrite(unit.pinIN3, LOW);   // مطابقة اتجاه الدوران للجهتين برمجياً
  digitalWrite(unit.pinIN4, HIGH);
}

void stopUnitMotors(CleaningUnit &unit) {
  analogWrite(unit.pinENA,  0);
  digitalWrite(unit.pinIN1, LOW);
  digitalWrite(unit.pinIN2, LOW);

  analogWrite(unit.pinENB,  0);
  digitalWrite(unit.pinIN3, LOW);
  digitalWrite(unit.pinIN4, LOW);
}

// =================================================================
//     دالة قياس مستوى الماء بالحساس الصوتي
//     تُعيد النسبة المئوية (0-100) وتضبط sensorOk للإشارة لصحة القراءة
// =================================================================
int measureWaterLevel(CleaningUnit &unit, bool &sensorOk) {
  digitalWrite(unit.pinTrig, LOW);
  delayMicroseconds(2);
  digitalWrite(unit.pinTrig, HIGH);
  delayMicroseconds(10);
  digitalWrite(unit.pinTrig, LOW);

  // انتظار الصدى بحد أقصى 30 مللي ثانية
  long duration = pulseIn(unit.pinEcho, HIGH, 30000);

  if (duration <= 80) {
    // النبضات القصيرة جداً هي تشويش كهربائي ناتج عن قرب الدبابيس وعم توصيل حساس فعلي
    sensorOk = false;
    return 0;
  }

  sensorOk = true;
  int distance = (int)(duration * 0.034 / 2);
  distance = constrain(distance, TANK_FULL_DISTANCE, TANK_EMPTY_DISTANCE);

  int waterPercent = map(distance, TANK_FULL_DISTANCE, TANK_EMPTY_DISTANCE, 100, 0);
  return constrain(waterPercent, 0, 100);
}
