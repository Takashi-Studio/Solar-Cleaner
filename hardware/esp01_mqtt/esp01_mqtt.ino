#include <ESP8266WiFi.h>
#include <DNSServer.h>
#include <ESP8266WebServer.h>
#include <WiFiManager.h>          // مكتبة إدارة شبكات الواي فاي التلقائية
#include <PubSubClient.h>         // مكتبة الاتصال بـ MQTT

// إعدادات افتراضية (يمكن تغييرها من خلال صفحة الإعدادات Captive Portal)
char mqtt_server[40] = "YOUR_VPS_IP";
char mqtt_port[6] = "1883";
char device_id[20] = "solar_cleaner_01";

// مواضيع الـ MQTT
char topic_commands[50];
char topic_status[50];

WiFiClient espClient;
PubSubClient client(espClient);

// متغير لحفظ حالة إذا كنا بحاجة لحفظ الإعدادات الجديدة
bool shouldSaveConfig = false;

// دالة رد اتصال لحفظ الإعدادات
void saveConfigCallback () {
  shouldSaveConfig = true;
}

void setup() {
  // استخدام منفذ Serial العادي للتخاطب مع الأردوينو ميقا بسرعة 115200
  Serial.begin(115200);
  delay(100);

  // إعداد ميزة WiFiManager
  WiFiManager wifiManager;

  // تعيين دالة حفظ الإعدادات
  wifiManager.setSaveConfigCallback(saveConfigCallback);

  // إضافة حقول إدخال مخصصة لصفحة الـ Captive Portal لإدخال إعدادات السيرفر
  WiFiManagerParameter custom_mqtt_server("server", "MQTT Broker IP (VPS)", mqtt_server, 40);
  WiFiManagerParameter custom_mqtt_port("port", "MQTT Port", mqtt_port, 6);
  WiFiManagerParameter custom_device_id("devid", "Device ID", device_id, 20);

  wifiManager.addParameter(&custom_mqtt_server);
  wifiManager.addParameter(&custom_mqtt_port);
  wifiManager.addParameter(&custom_device_id);

  // محاولة الاتصال بالشبكة المحفوظة، وإذا فشل يبث شبكة تهيئة باسم "Solar-Cleaner-Setup"
  if (!wifiManager.autoConnect("Solar-Cleaner-Setup")) {
    Serial.println("E:Failed to connect and hit timeout");
    delay(3000);
    ESP.reset();
    delay(5000);
  }

  // قراءة القيم التي أدخلها المستخدم في صفحة الإعدادات
  strcpy(mqtt_server, custom_mqtt_server.getValue());
  strcpy(mqtt_port, custom_mqtt_port.getValue());
  strcpy(device_id, custom_device_id.getValue());

  // إعداد مواضيع MQTT بناءً على معرّف الجهاز
  snprintf(topic_commands, sizeof(topic_commands), "device/%s/commands", device_id);
  snprintf(topic_status, sizeof(topic_status), "device/%s/status", device_id);

  // إعداد خادم الـ MQTT
  int port = atoi(mqtt_port);
  client.setServer(mqtt_server, port);
  client.setCallback(mqttCallback);

  Serial.println("I:WiFi Connected");
}

// دالة استقبال رسائل الـ MQTT من السيرفر
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // تحويل الحمولة (Payload) إلى نص
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  // إرسال الأمر مباشرة إلى الأردوينو ميقا عبر منفذ Serial
  // صيغة الرسالة المرسلة للأردوينو: C:COMMAND (مثال: C:START_CLEAN أو C:STOP_CLEAN)
  Serial.print("C:");
  Serial.println(message);
}

// إعادة الاتصال بسيرفر MQTT في حال انقطاع الاتصال
void reconnectMQTT() {
  while (!client.connected()) {
    // إرسال حالة الاتصال للأردوينو للتوضيح
    Serial.println("I:Attempting MQTT connection...");
    
    // إنشاء اتصال مع تحديد رسالة "الوصية الأخيرة" (Last Will) لتعريف السيرفر إذا انقطع الجهاز فجأة
    String willTopic = "device/" + String(device_id) + "/status";
    String willMessage = "{\"status\":\"offline\"}";
    
    if (client.connect(device_id, device_id, NULL, willTopic.c_str(), 1, true, willMessage.c_str())) {
      Serial.println("I:MQTT Connected");
      // الاشتراك في موضوع استقبال الأوامر
      client.subscribe(topic_commands);
      // نشر حالة الاتصال النشطة
      client.publish(topic_status, "{\"status\":\"online\"}", true);
    } else {
      Serial.print("E:MQTT Connection Failed, rc=");
      Serial.print(client.state());
      Serial.println(" - Retrying in 5 seconds");
      delay(5000);
    }
  }
}

void loop() {
  // التأكد من استمرار اتصال الـ MQTT والـ WiFi
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop();

  // فحص إذا كان هناك بيانات مرسلة من الأردوينو ميقا عبر Serial لتمريرها للسيرفر
  if (Serial.available()) {
    String incomingData = Serial.readStringUntil('\n');
    incomingData.trim();

    // نتحقق من نوع البيانات المرسلة من الأردوينو:
    // إذا بدأت بـ "W:" تعني إرسال مستوى مياه الخزان
    // إذا بدأت بـ "S:" تعني إرسال حالة التشغيل (مثلاً: S:CLEANING_DONE أو S:CLEANING_IN_PROGRESS)
    if (incomingData.startsWith("W:") || incomingData.startsWith("S:")) {
      String payload = "";
      if (incomingData.startsWith("W:")) {
        String level = incomingData.substring(2);
        payload = "{\"water_level\":" + level + ", \"status\":\"online\"}";
      } else if (incomingData.startsWith("S:")) {
        String state = incomingData.substring(2);
        payload = "{\"state\":\"" + state + "\", \"status\":\"online\"}";
      }
      
      // نشر البيانات في موضوع الحالة الخاص بالجهاز على السيرفر
      if (payload.length() > 0) {
        client.publish(topic_status, payload.c_str());
      }
    }
  }
}
