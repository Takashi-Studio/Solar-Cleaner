#include <ESP8266WiFi.h>
#include <DNSServer.h>
#include <ESP8266WebServer.h>
#include <WiFiManager.h>          // مكتبة إدارة شبكات الواي فاي التلقائية
#include <PubSubClient.h>         // مكتبة الاتصال بـ MQTT
#include <ESP8266HTTPClient.h>
#include <ESP8266httpUpdate.h>
#include <WiFiClientSecure.h>     // مكتبة الاتصال الآمن بـ HTTPS

#define FIRMWARE_VERSION "1.1.2" // تنبيه: يجب رفع رقم الإصدار عند إجراء أي تعديل برميجي مستقبلي على هذا الكود

// تحديث سرعة الاتصال لتفادي تشويه البيانات (9600)
// إعدادات افتراضية (يمكن تغييرها من خلال صفحة الإعدادات Captive Portal)
char mqtt_server[40] = "161.97.152.98";
char mqtt_port[6] = "1883";
char device_id[20] = ""; // معرّف الهاردوير الفريد لقطعة الواي فاي (Hex Chip ID)
String current_controller_id = ""; // معرّف الأردوينو ميقا (يُكتشف تلقائياً من رسائل الأردوينو)

WiFiClient espClient;
PubSubClient client(espClient);

// متغير لحفظ حالة إذا كنا بحاجة لحفظ الإعدادات الجديدة
bool shouldSaveConfig = false;

// متغيرات التحكم في توقيت إعادة اتصال MQTT بشكل غير حاصر
unsigned long lastReconnectAttempt = 0;
const unsigned long reconnectInterval = 5000; // حاول كل 5 ثوانٍ

// متغيرات إرسال نبضات القلب (Heartbeat) بشكل دوري للحفاظ على حالة الاتصال بالخادم
unsigned long lastHeartbeat = 0;
const unsigned long heartbeatInterval = 30000; // كل 30 ثانية (أقل من الـ 90 ثانية في السيرفر)

// متغيرات لتأجيل فحص التحديث التلقائي الأول بعد الإقلاع
bool initialOTACheckDone = false;
const unsigned long otaDelayTime = 180000; // 3 دقائق بالملي ثانية

// راية لتفعيل فحص التحديثات بشكل آمن من دالة loop
volatile bool triggerOTA = false;

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
  // تحويل الرسالة إلى نص لمعاينتها واكتشاف أوامر التحديث
  String payloadStr = "";
  for (unsigned int i = 0; i < length; i++) {
    payloadStr += (char)payload[i];
  }

  // 1. إذا كان الأمر خاص بتحديث القطعة سحابياً
  if (payloadStr.indexOf("\"cmd\":\"check_ota\"") != -1 || 
      payloadStr.indexOf("\"cmd\":\"update_firmware\"") != -1) {
    Serial.println("I:OTA update triggered via MQTT from server.");
    triggerOTA = true;
    return; // لا نمرر هذا الأمر للأردوينو ميقا
  }

  // 2. تمرير الأوامر الأخرى مباشرة للأردوينو ميقا عبر Serial كـ JSON
  Serial.println(payloadStr);
}

// محاولة إعادة الاتصال بسيرفر MQTT بشكل غير حاصر
bool reconnectMQTTNonBlocking() {
  // لا نطبع محاولة الاتصال لتفادي كثرة الرسائل في الشاشة عند عدم وجود سيرفر
  
  String activeId = (current_controller_id.length() > 0) ? current_controller_id : String(device_id);
  
  char topic_telemetry[60];
  snprintf(topic_telemetry, sizeof(topic_telemetry), "controller/%s/telemetry", activeId.c_str());
  
  String willMessage = "{\"controller\":\"" + activeId + "\",\"status\":\"offline\"}";
  
  if (client.connect(device_id, device_id, NULL, topic_telemetry, 1, true, willMessage.c_str())) {
    Serial.println("I:MQTT Connected");
    
    char topic_commands[60];
    snprintf(topic_commands, sizeof(topic_commands), "controller/%s/commands", activeId.c_str());
    client.subscribe(topic_commands);
    
    String onlineMessage = "{\"controller\":\"" + activeId + "\",\"status\":\"online\"}";
    client.publish(topic_telemetry, onlineMessage.c_str(), true);
    return true;
  } else {
    Serial.print("E:MQTT Connection Failed, rc=");
    Serial.println(client.state());
    return false;
  }
}

// دالة فحص وتثبيت التحديثات البرمجية لاسلكياً عبر السيرفر (OTA)
void checkOTAUpdate() {
  // الانتظار حتى الحصول على عنوان IP صالح واستقرار الاتصال بالإنترنت
  int retries = 0;
  while (WiFi.status() != WL_CONNECTED || WiFi.localIP().toString() == "0.0.0.0") {
    delay(500);
    retries++;
    if (retries > 20) { // 10 ثوانٍ كحد أقصى
      Serial.println("E:WiFi not ready. Skipping OTA.");
      return;
    }
  }

  Serial.println("I:Checking for firmware updates...");
  
  WiFiClientSecure otaClient;
  otaClient.setInsecure(); // تجاهل التحقق من شهادة الـ SSL لتسهيل الاتصال بـ HTTPS
  
  HTTPClient http;
  
  // بناء الرابط لقراءة إصدار التحديث المتوفر على السيرفر (HTTPS)
  String versionUrl = "https://api.solar.dev.takashi-studio.com/firmware/version.txt";
  
  if (http.begin(otaClient, versionUrl)) {
    int httpCode = http.GET();
    if (httpCode == HTTP_CODE_OK) {
      String latestVersion = http.getString();
      latestVersion.trim();
      
      if (latestVersion.length() > 0 && latestVersion != FIRMWARE_VERSION) {
        Serial.print("I:New firmware [");
        Serial.print(latestVersion);
        Serial.println("] detected! Starting OTA Update...");
        
        // بناء رابط تحميل كود التحديث البرمجي الجديد (HTTPS)
        String binaryUrl = "https://api.solar.dev.takashi-studio.com/firmware/latest.bin";
        
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
  // استخدام منفذ Serial للتخاطب مع الأردوينو ميقا بسرعة 9600
  Serial.begin(9600);
  delay(100);

  // طباعة إصدار البرنامج مباشرة عند الإقلاع
  Serial.print("I:Firmware Version: ");
  Serial.println(FIRMWARE_VERSION);
  Serial.println("I:Minor update compiled for OTA testing.");

  // توليد معرف فريد للجهاز بناءً على Chip ID الخاص بـ ESP8266 بصيغة ست عشرية (Hexadecimal)
  uint32_t chipId = ESP.getChipId();
  snprintf(device_id, sizeof(device_id), "%08X", chipId);

  // إعداد ميزة WiFiManager
  WiFiManager wifiManager;

  // تخصيص شكل صفحة الإعدادات وتطبيق تصميم عصري (Dark Mode & Glassmorphism) باللون الأزرق
  const char* custom_html_head = 
    "<link href='https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap' rel='stylesheet'>"
    "<style>"
    "body { background: #0a0f1a; color: #e2e8f0; font-family: 'Cairo', sans-serif; margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }"
    ".c { background: rgba(15, 23, 42, 0.75) !important; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.08) !important; padding: 30px !important; border-radius: 20px !important; box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.5) !important; width: 100% !important; max-width: 420px !important; box-sizing: border-box !important; display: inline-block !important; text-align: center !important; }"
    "h1, h2, h3 { color: #60a5fa !important; text-align: center !important; font-weight: 700 !important; margin-top: 0 !important; margin-bottom: 20px !important; font-size: 24px !important; text-shadow: 0 0 10px rgba(96, 165, 250, 0.3) !important; }"
    "input[type='text'], input[type='password'] { width: 100% !important; padding: 14px !important; margin: 12px 0 !important; border: 1px solid rgba(255, 255, 255, 0.15) !important; border-radius: 10px !important; background: rgba(255, 255, 255, 0.04) !important; color: #fff !important; font-size: 16px !important; box-sizing: border-box !important; transition: all 0.3s ease !important; text-align: center !important; }"
    "input[type='text']:focus, input[type='password']:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25) !important; outline: none !important; background: rgba(255, 255, 255, 0.08) !important; }"
    "button, input[type='submit'] { width: 100% !important; padding: 14px !important; margin: 15px 0 !important; border: none !important; border-radius: 10px !important; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%) !important; color: #fff !important; font-weight: 700 !important; font-size: 16px !important; cursor: pointer !important; transition: all 0.3s ease !important; box-shadow: 0 4px 15px rgba(29, 78, 216, 0.4) !important; font-family: 'Cairo', sans-serif !important; }"
    "button:hover, input[type='submit']:hover { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%) !important; transform: translateY(-2px) !important; box-shadow: 0 6px 20px rgba(37, 99, 235, 0.5) !important; }"
    "button:active, input[type='submit']:active { transform: translateY(0) !important; }"
    "a { color: #60a5fa !important; text-decoration: none !important; display: block !important; text-align: center !important; margin-top: 20px !important; font-weight: 600 !important; transition: color 0.2s ease !important; }"
    "a:hover { color: #93c5fd !important; text-decoration: underline !important; }"
    "a[href='#p'] { background: rgba(255, 255, 255, 0.03) !important; border: 1px solid rgba(255, 255, 255, 0.08) !important; padding: 8px 14px !important; border-radius: 8px !important; color: #e2e8f0 !important; text-align: left !important; margin: 14px 0 !important; display: flex !important; justify-content: space-between !important; align-items: center !important; transition: all 0.2s ease !important; text-decoration: none !important; font-size: 14px !important; }"
    "a[href='#p']:hover { background: rgba(59, 130, 246, 0.12) !important; border-color: #3b82f6 !important; color: #fff !important; transform: scale(1.02) !important; }"
    "span.q { font-size: 12px !important; color: #94a3b8 !important; font-weight: bold !important; margin-left: auto !important; }"
    "div.msg { background: rgba(239, 68, 68, 0.1) !important; border: 1px solid rgba(239, 68, 68, 0.2) !important; color: #fca5a5 !important; padding: 12px !important; border-radius: 8px !important; margin-bottom: 15px !important; text-align: center !important; font-size: 14px !important; }"
    "</style>"
    "<script>"
    "document.addEventListener('DOMContentLoaded', function() {"
    "  document.title = 'APW System Setup';"
    "  var header = document.querySelector('h1') || document.querySelector('h2');"
    "  if (header) header.innerHTML = 'APW System <span style=\"font-size:14px; display:block; opacity:0.7; margin-top:5px;\">v" FIRMWARE_VERSION "</span>';"
    "  var links = document.querySelectorAll('a');"
    "  links.forEach(function(link) {"
    "    if (link.getAttribute('href') === '/' || link.innerText.toLowerCase().includes('back') || link.innerText.includes('عودة')) {"
    "      link.style.display = 'block';"
    "      link.style.width = '100%';"
    "      link.style.padding = '14px';"
    "      link.style.margin = '15px 0';"
    "      link.style.boxSizing = 'border-box';"
    "      link.style.borderRadius = '10px';"
    "      link.style.background = 'rgba(255, 255, 255, 0.05)';"
    "      link.style.border = '1px solid rgba(255, 255, 255, 0.15)';"
    "      link.style.color = '#fff';"
    "      link.style.fontWeight = '700';"
    "      link.style.textAlign = 'center';"
    "      link.style.fontSize = '16px';"
    "      link.style.cursor = 'pointer';"
    "      link.style.transition = 'all 0.3s ease';"
    "      link.style.textDecoration = 'none';"
    "      link.addEventListener('mouseenter', function() {"
    "        link.style.background = 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';"
    "        link.style.borderColor = 'transparent';"
    "        link.style.boxShadow = '0 4px 15px rgba(29, 78, 216, 0.4)';"
    "        link.style.transform = 'translateY(-2px)';"
    "      });"
    "      link.addEventListener('mouseleave', function() {"
    "        link.style.background = 'rgba(255, 255, 255, 0.05)';"
    "        link.style.borderColor = 'rgba(255, 255, 255, 0.15)';"
    "        link.style.boxShadow = 'none';"
    "        link.style.transform = 'translateY(0)';"
    "      });"
    "    }"
    "  });"
    "});"
    "</script>";
  wifiManager.setCustomHeadElement(custom_html_head);

  // تعيين دالة حفظ الإعدادات
  wifiManager.setSaveConfigCallback(saveConfigCallback);
  // تعيين دالة نمط الإعداد (بث شبكة الواي فاي)
  wifiManager.setAPCallback(configModeCallback);

  // بث شبكة تهيئة مخصصة تحمل اسم المعرّف الفريد للجهاز لكي يعرفه الأدمن بسهولة عند التهيئة
  char ap_name[30];
  snprintf(ap_name, sizeof(ap_name), "APW-Setup-%s", device_id);

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
  client.setKeepAlive(60); // زيادة وقت الحفاظ على الاتصال لتفادي انقطاعه عند انشغال المعالج ونقل البيانات

  Serial.print("I:Device ID: ");
  Serial.println(device_id);
  Serial.println("I:WiFi Connected");

  // ملاحظة: تم إزالة checkOTAUpdate() من هنا تماماً لمنع محاولات الاتصال بالإنترنت عند الإقلاع
}

void loop() {
  // 1. محاولة إعادة الاتصال بـ MQTT فقط إذا كان الواي فاي متصلاً فعلياً
  if (WiFi.status() == WL_CONNECTED) {
    if (!client.connected()) {
      unsigned long now = millis();
      if (now - lastReconnectAttempt > reconnectInterval || lastReconnectAttempt == 0) {
        lastReconnectAttempt = now;
        if (reconnectMQTTNonBlocking()) {
          lastReconnectAttempt = 0;
        }
      }
    } else {
      client.loop();
      
      // إرسال نبضة قلب دورية للحفاظ على حالة الاتصال (Online) في قاعدة البيانات وتفادي قطع الاتصال
      unsigned long now = millis();
      if (now - lastHeartbeat >= heartbeatInterval || lastHeartbeat == 0) {
        lastHeartbeat = now;
        String activeId = (current_controller_id.length() > 0) ? current_controller_id : String(device_id);
        char topic_telemetry[60];
        snprintf(topic_telemetry, sizeof(topic_telemetry), "controller/%s/telemetry", activeId.c_str());
        String onlineMessage = "{\"controller\":\"" + activeId + "\",\"status\":\"online\"}";
        client.publish(topic_telemetry, onlineMessage.c_str(), true);
      }
    }
  }

  // 1.5 الفحص التلقائي المؤجل لمرة واحدة بعد 3 دقائق من الإقلاع واستقرار الشبكة
  if (!initialOTACheckDone && WiFi.status() == WL_CONNECTED) {
    if (millis() > otaDelayTime) {
      initialOTACheckDone = true;
      triggerOTA = true;
    }
  }

  // 2. فحص راية تحديث النظام (OTA) لتشغيل التحديث بشكل آمن
  // يتم تشغيل هذا الشرط فقط إذا كان هناك طلب صريح وكان الواي فاي متصلاً
  if (triggerOTA && WiFi.status() == WL_CONNECTED) {
    triggerOTA = false;
    checkOTAUpdate();
  }

  // 3. فحص الأوامر الواردة من الأردوينو ميقا عبر السيريال (متاحة دائماً)
  if (Serial.available()) {
    String incomingData = Serial.readStringUntil('\n');
    incomingData.trim();

    if (incomingData.length() > 0) {
      // أ. فحص أمر إعادة ضبط الواي فاي
      if (incomingData == "RESET_WIFI" || 
          incomingData.indexOf("\"cmd\":\"reset_wifi\"") != -1 || 
          incomingData.indexOf("\"command\":\"reset_wifi\"") != -1) {
        
        Serial.println("I:WiFi reset command received via Serial. Clearing settings and restarting...");
        WiFiManager wifiManager;
        wifiManager.resetSettings();
        delay(1000);
        ESP.restart();
        return;
      }

      // ب. فحص أمر تحديث النظام الموجه من الأردوينو ميقا
      if (incomingData == "CHECK_OTA" || 
          incomingData.indexOf("\"cmd\":\"check_ota\"") != -1) {
        
        Serial.println("I:OTA check triggered via Serial.");
        triggerOTA = true;
        return;
      }

      // ج. تمرير بيانات التليمتري والـ JSON كالمعتاد إلى السيرفر عبر MQTT
      if (incomingData.startsWith("{")) {
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

        // تمرير الـ JSON المستلم مباشرة كما هو إلى السيرفر عبر MQTT (فقط إذا كان متصلاً)
        if (client.connected()) {
          String activeId = (current_controller_id.length() > 0) ? current_controller_id : String(device_id);
          char topic_telemetry[60];
          snprintf(topic_telemetry, sizeof(topic_telemetry), "controller/%s/telemetry", activeId.c_str());
          client.publish(topic_telemetry, incomingData.c_str());
        }
      }
    }
  }
}