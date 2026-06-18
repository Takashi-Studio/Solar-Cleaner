#include <ESP8266WiFi.h>
#include <DNSServer.h>
#include <ESP8266WebServer.h>
#include <WiFiManager.h>          // مكتبة إدارة شبكات الواي فاي التلقائية
#include <PubSubClient.h>         // مكتبة الاتصال بـ MQTT
#include <ESP8266HTTPClient.h>
#include <ESP8266httpUpdate.h>

#define FIRMWARE_VERSION "1.0.0"

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

// دالة فحص وتثبيت التحديثات البرمجية لاسلكياً عبر السيرفر (OTA)
void checkOTAUpdate() {
  Serial.println("I:Checking for firmware updates...");
  
  WiFiClient otaClient;
  HTTPClient http;
  
  // بناء الرابط لقراءة إصدار التحديث المتوفر على السيرفر
  String versionUrl = "http://" + String(mqtt_server) + ":5000/firmware/version.txt";
  
  if (http.begin(otaClient, versionUrl)) {
    int httpCode = http.GET();
    if (httpCode == HTTP_CODE_OK) {
      String latestVersion = http.getString();
      latestVersion.trim();
      
      if (latestVersion.length() > 0 && latestVersion != FIRMWARE_VERSION) {
        Serial.print("I:New firmware [");
        Serial.print(latestVersion);
        Serial.println("] detected! Starting OTA Update...");
        
        // بناء رابط تحميل كود التحديث البرمجي الجديد
        String binaryUrl = "http://" + String(mqtt_server) + ":5000/firmware/latest.bin";
        
        // محاولة تحميل وتثبيت التحديث
        t_httpUpdate_return ret = ESPhttpUpdate.update(otaClient, binaryUrl);
        
        switch (ret) {
          case HTTP_UPDATE_FAILED:
            Serial.print("E:OTA Update Failed. Error: ");
            Serial.println(ESPhttpUpdate.getLastErrorString());
            break;
          case HTTP_UPDATE_NO_UPDATES:
            Serial.println("I:No updates found.");
            break;
          case HTTP_UPDATE_OK:
            Serial.println("I:OTA Update Success! Rebooting...");
            delay(500);
            ESP.restart();
            break;
        }
      } else {
        Serial.println("I:Firmware is up-to-date.");
      }
    } else {
      Serial.print("E:Failed to check version, HTTP code: ");
      Serial.println(httpCode);
    }
    http.end();
  } else {
    Serial.println("E:HTTP begin failed for OTA check.");
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

  // تخصيص شكل صفحة الإعدادات وتطبيق تصميم عصري (Dark Mode & Glassmorphism)
  const char* custom_html_head = 
    "<link href='https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap' rel='stylesheet'>"
    "<style>"
    "body { background: #0a0f1a; color: #e2e8f0; font-family: 'Cairo', sans-serif; margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; direction: rtl; }"
    "div { background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.08); padding: 30px; border-radius: 20px; box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.5); width: 100%; max-width: 420px; box-sizing: border-box; }"
    "h1, h2, h3 { color: #60a5fa; text-align: center; font-weight: 700; margin-top: 0; margin-bottom: 20px; font-size: 24px; text-shadow: 0 0 10px rgba(96, 165, 250, 0.3); }"
    "input[type='text'], input[type='password'] { width: 100%; padding: 14px; margin: 12px 0; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 10px; background: rgba(255, 255, 255, 0.04); color: #fff; font-size: 16px; box-sizing: border-box; transition: all 0.3s ease; text-align: center; }"
    "input[type='text']:focus, input[type='password']:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25); outline: none; background: rgba(255, 255, 255, 0.08); }"
    "button, input[type='submit'] { width: 100%; padding: 14px; margin: 15px 0; border: none; border-radius: 10px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #fff; font-weight: 700; font-size: 16px; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(29, 78, 216, 0.4); font-family: 'Cairo', sans-serif; }"
    "button:hover, input[type='submit']:hover { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); transform: translateY(-2px); box-shadow: 0 6px 20px rgba(37, 99, 235, 0.5); }"
    "button:active, input[type='submit']:active { transform: translateY(0); }"
    "a { color: #60a5fa; text-decoration: none; display: block; text-align: center; margin-top: 20px; font-weight: 600; transition: color 0.2s ease; }"
    "a:hover { color: #93c5fd; text-decoration: underline; }"
    "a[href='#p'] { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); padding: 12px 16px; border-radius: 10px; color: #e2e8f0; text-align: right; margin: 10px 0; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease; text-decoration: none; }"
    "a[href='#p']:hover { background: rgba(59, 130, 246, 0.12); border-color: #3b82f6; color: #fff; transform: scale(1.02); }"
    "span.q { font-size: 14px; color: #94a3b8; font-weight: bold; margin-right: auto; }"
    "div.msg { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #fca5a5; padding: 12px; border-radius: 8px; margin-bottom: 15px; text-align: center; font-size: 14px; }"
    "</style>";
  wifiManager.setCustomHeadElement(custom_html_head);

  // تعيين دالة حفظ الإعدادات
  wifiManager.setSaveConfigCallback(saveConfigCallback);
  // تعيين دالة نمط الإعداد (بث شبكة الواي فاي)
  wifiManager.setAPCallback(configModeCallback);

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

  // إعداد خادم الـ MQTT
  int port = atoi(mqtt_port);
  client.setServer(mqtt_server, port);
  client.setCallback(mqttCallback);

  Serial.print("I:Device ID: ");
  Serial.println(device_id);
  Serial.println("I:WiFi Connected");

  // فحص وجود تحديثات برمجية سحابية وتثبيتها تلقائياً
  checkOTAUpdate();
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
