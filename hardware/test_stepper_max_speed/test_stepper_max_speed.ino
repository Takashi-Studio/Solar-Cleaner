#include <AccelStepper.h>

// تعريف دبابيس المحرك الأول (IN1, IN2, IN3, IN4) الموصول بالـ ULN2003
#define PIN_IN1 2
#define PIN_IN2 3
#define PIN_IN3 4
#define PIN_IN4 5

// --- طريقة الفحص بنصف الخطوة (HALFSTEP = 8) ---
// نصف الخطوة يمنح المحرك عزم دوران (Torque) مضاعف وقوي جداً
// ويمنعه تماماً من حدوث طنين أو تعليق (Stalling) تحت أي ظرف
#define HALFSTEP 8

// تهيئة المحرك بالترتيب القياسي الصحيح لنمط نصف الخطوة (IN1, IN3, IN2, IN4)
AccelStepper stepper(HALFSTEP, PIN_IN1, PIN_IN3, PIN_IN2, PIN_IN4);

void setup() {
  // ضبط السرعة القصوى على سرعة آمنة، ناعمة وذات عزم قوي جداً (500 خطوة في الثانية)
  stepper.setMaxSpeed(500.0);      
  
  // ضبط التسارع ليكون ناعماً وسهلاً للمحرك (250)
  stepper.setAcceleration(250.0);  
  
  // توجيه المحرك للتحرك لمسافة قصيرة للأمام (نصف دورة فقط لتجربة الذهاب والإياب = 2048 خطوة)
  stepper.moveTo(2048);
}

void loop() {
  // بمجرد وصول المحرك للهدف، يتم عكس الاتجاه فوراً والدوران للخلف
  if (stepper.distanceToGo() == 0) {
    if (stepper.currentPosition() == 2048) {
      stepper.moveTo(0); // العودة للخلف مسافة قصيرة
    } else {
      stepper.moveTo(2048); // الذهاب للأمام مسافة قصيرة
    }
  }
  
  // تشغيل النبضات باستمرار
  stepper.run();
}
