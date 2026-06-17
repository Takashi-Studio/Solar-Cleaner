#include <ESP8266WiFi.h>
#include <DNSServer.h>
#include <ESP8266WebServer.h>
#include <WiFiManager.h>          // مكتبة إدارة شبكات الواي فاي التلقائية
#include <PubSubClient.h>         // مكتبة الاتصال بـ MQTT

// إعدادات افتراضية (يمكن تغييرها من خلال صفحة الإعدادات Captive Portal)
char mqtt_server[40] = "161.97.152.98";
char mqtt_port[6] = "1883";
char device_id[20] = ""; // معرّف الهاردوير الفريد لقطعة الواي فاي (Hex Chip ID)
String current_controller_id = ""; // معرّف الأردوينو ميقا (يُكتشف تلقائياً من رسائل الأردوينو)

WiFiClient espClient;
PubSubClient client(espClient);

// متغير لحفظ حالة إذا كنا بحاجة لحفظ الإعدادات الجديدة
bool shouldSaveConfig = false;

// دالة رد اتصال لحفظ الإعدادات
void saveConfigCallback () {
  shouldSaveConfig = true;
}

// دالة رد اتصال يتم تشغيلها عند فشل الاتصال بالواي فاي والبدء في بث شبكة تهيئة (AP)
void configModeCallback (WiFiManager *myWiFiManager) {
  Serial.print("I:WiFi offline or not configured. Starting Setup Hotspot AP: ");
  Serial.println(myWiFiManager->getConfigPortalSSID());
}

// دالة استقبال رسائل الـ MQTT من السيرفر
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // تمرير الأمر مباشرة إلى الأردوينو ميقا عبر Serial كـ JSON
  for (unsigned int i = 0; i < length; i++) {
    Serial.write((char)payload[i]);
  }
  Serial.println(); // سطر جديد لتفعيل القراءة في الأردوينو
}

// إعادة الاتصال بسيرفر MQTT في حال انقطاع الاتصال
void reconnectMQTT() {
  while (!client.connected()) {
    Serial.println("I:Attempting MQTT connection...");
    
    String activeId = (current_controller_id.length() > 0) ? current_controller_id : String(device_id);
    
    // إعداد موضوع الحالة والوصية الأخيرة
    char topic_telemetry[60];
    snprintf(topic_telemetry, sizeof(topic_telemetry), "controller/%s/telemetry", activeId.c_str());
    
    String willMessage = "{\"controller\":\"" + activeId + "\",\"status\":\"offline\"}";
    
    if (client.connect(device_id, device_id, NULL, topic_telemetry, 1, true, willMessage.c_str())) {
      Serial.println("I:MQTT Connected");
      
      // الاشتراك في موضوع استقبال الأوامر
      char topic_commands[60];
      snprintf(topic_commands, sizeof(topic_commands), "controller/%s/commands", activeId.c_str());
      client.subscribe(topic_commands);
      
      // نشر حالة الاتصال النشطة
      String onlineMessage = "{\"controller\":\"" + activeId + "\",\"status\":\"online\"}";
      client.publish(topic_telemetry, onlineMessage.c_str(), true);
    } else {
      Serial.print("E:MQTT Connection Failed, rc=");
      Serial.print(client.state());
      Serial.println(" - Retrying in 5 seconds");
      delay(5000);
    }
  }
}

void setup() {
  // استخدام منفذ Serial للتخاطب مع الأردوينو ميقا بسرعة 115200
  Serial.begin(115200);
  delay(100);

  // توليد معرف فريد للجهاز بناءً على Chip ID الخاص بـ ESP8266 بصيغة ست عشرية (Hexadecimal)
  uint32_t chipId = ESP.getChipId();
  snprintf(device_id, sizeof(device_id), "%08X", chipId);

  // إعداد ميزة WiFiManager
  WiFiManager wifiManager;

  // تعيين دالة حفظ الإعدادات
  wifiManager.setSaveConfigCallback(saveConfigCallback);
  // تعيين دالة نمط الإعداد (بث شبكة الواي فاي)
  wifiManager.setAPCallback(configModeCallback);

  // إضافة حقول إدخال مخصصة لصفحة الـ Captive Portal لإدخل إعدادات السيرفر
  WiFiManagerParameter custom_mqtt_server("server", "MQTT Broker IP (VPS)", mqtt_server, 40);
  WiFiManagerParameter custom_mqtt_port("port", "MQTT Port", mqtt_port, 6);

  wifiManager.addParameter(&custom_mqtt_server);
  wifiManager.addParameter(&custom_mqtt_port);

  // بث شبكة تهيئة مخصصة تحمل اسم المعرّف الفريد للجهاز لكي يعرفه الأدمن بسهولة عند التهيئة
  char ap_name[30];
  snprintf(ap_name, sizeof(ap_name), "Solar-Setup-%s", device_id);

  // محاولة الاتصال بالشبكة المحفوظة، وإذا فشل يبث شبكة التهيئة الخاصة بالجهاز
  if (!wifiManager.autoConnect(ap_name)) {
    Serial.println("E:Failed to connect and hit timeout");
    delay(3000);
    ESP.reset();
    delay(5000);
  }

  // قراءة القيم التي أدخلها المستخدم في صفحة الإعدادات
  strcpy(mqtt_server, custom_mqtt_server.getValue());
  strcpy(mqtt_port, custom_mqtt_port.getValue());

  // إعداد خادم الـ MQTT
  int port = atoi(mqtt_port);
  client.setServer(mqtt_server, port);
  client.setCallback(mqttCallback);

  Serial.print("I:Device ID: ");
  Serial.println(device_id);
  Serial.println("I:WiFi Connected");
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

    if (incomingData.length() > 0 && incomingData.startsWith("{")) {
      // استكشاف معرف الأردوينو ميقا تلقائياً من خلال الـ JSON لتحديث موضوع الاشتراك
      int startIdx = incomingData.indexOf("\"controller\":\"");
      if (startIdx != -1) {
        startIdx += 14;
        int endIdx = incomingData.indexOf("\"", startIdx);
        if (endIdx != -1) {
          String detectedId = incomingData.substring(startIdx, endIdx);
          if (detectedId != current_controller_id) {
            // إلغاء الاشتراك القديم إذا كان موجوداً
            if (current_controller_id.length() > 0) {
              char old_topic_commands[60];
              snprintf(old_topic_commands, sizeof(old_topic_commands), "controller/%s/commands", current_controller_id.c_str());
              client.unsubscribe(old_topic_commands);
            }
            
            current_controller_id = detectedId;
            
            // الاشتراك في موضوع الأوامر الجديد
            char new_topic_commands[60];
            snprintf(new_topic_commands, sizeof(new_topic_commands), "controller/%s/commands", current_controller_id.c_str());
            client.subscribe(new_topic_commands);
            
            Serial.print("I:Linked to controller: ");
            Serial.println(current_controller_id);
          }
        }
      }

      // تمرير الـ JSON المستلم مباشرة كما هو إلى السيرفر عبر MQTT
      String activeId = (current_controller_id.length() > 0) ? current_controller_id : String(device_id);
      char topic_telemetry[60];
      snprintf(topic_telemetry, sizeof(topic_telemetry), "controller/%s/telemetry", activeId.c_str());
      client.publish(topic_telemetry, incomingData.c_str());
    }
  }
}
