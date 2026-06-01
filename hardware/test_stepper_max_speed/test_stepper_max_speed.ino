#include <AccelStepper.h>

// تعريف دبابيس المحرك الأول (IN1, IN2, IN3, IN4) الموصول بالـ ULN2003
#define PIN_IN1 2
#define PIN_IN2 3
#define PIN_IN3 4
#define PIN_IN4 5

// --- طريقة الوصول للسرعة القصوى المطلقة لمحرك 28BYJ-48 ---
// نستخدم نمط الخطوة الكاملة (FULL4WIRE = 4) بدلاً من نصف الخطوة
// لأن الخطوة الكاملة تتطلب نصف التردد البرمجي (2048 خطوة للدورة الكاملة) 
// مما يسمح للمحرك بالوصول لسرعات فيزيائية أعلى بكثير دون حدوث طنين أو تعليق (Stalling)
#define FULLSTEP 4

// تهيئة المحرك بالترتيب القياسي الصحيح لنمط الخطوة الكاملة (IN1, IN3, IN2, IN4)
AccelStepper stepper(FULLSTEP, PIN_IN1, PIN_IN3, PIN_IN2, PIN_IN4);

void setup() {
  // ضبط السرعة القصوى على سرعة متوسطة، ناعمة ومستقرة تماماً (800 خطوة في الثانية)
  stepper.setMaxSpeed(800.0);      
  
  // ضبط التسارع ليكون ناعماً ومتوازناً (400)
  stepper.setAcceleration(400.0);  
  
  // توجيه المحرك للتحرك لمسافة طويلة مستمرة للأمام (10 دورات كاملة = 20480 خطوة)
  stepper.moveTo(20480);
}

void loop() {
  // بمجرد وصول المحرك للهدف، يتم عكس الاتجاه فوراً والدوران للخلف
  if (stepper.distanceToGo() == 0) {
    if (stepper.currentPosition() == 20480) {
      stepper.moveTo(0); // العودة للخلف بأقصى سرعة
    } else {
      stepper.moveTo(20480); // الذهاب للأمام بأقصى سرعة
    }
  }
  
  // تشغيل النبضات باستمرار
  stepper.run();
}
