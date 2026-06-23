
HADHRAMOUT UNIVERSITY
COLLEGE OF ENGINEERING & PETROLEUM
COMPUTER ENGINEERING DEPARTMENT


AUTOMATIC BANNING WASHING SYSTEM
A FINAL PROJECT SUBMITTED IN PARTIAL FULFILMENT OF THE REQUIREMENTS FOR THE DEGREE OF BACHELOR OF ENGINEERING IN COMPUTER ENGINEERING 

By

Abdulrahman Amin Rubaia Bin Tayeb
Mohammed Saeed Omar Bahashwan
Omer Abdullah Mohammed Basloom
Ahmed Saeed Mohmmed Bashkeel

SUPERVISOR
Dr. MAKAREM BAMATRAF 


ALMUKALLA
DECEMBER 2025
Supervisor Certificate

I certify that the preparation of this project entitled:

" Automatic Banning Washing System ",

and prepared by:  

1- Abdulrahman Amin Rubaia Bin Tayeb
2- Ahmed Saeed Mohmmed Bashkeel
3- Mohammed Saeed Omar Bahashwan
4- Omer Abdullah Mohammed Basloom


Was made under my supervision at Computer Engineering department in partial fulfillment of the requirements of the degree of Bachelor of Engineering in Computer Engineering.

Signature:
Name: Dr. Makarem Bamatraf 

Date:






DEDICATION

To whom my heart is happy to meet her
To the garden of love that grows the brightest flowers
My mom
A symbol of manhood and sacrifice
To the one who pushed me to knowledge and in which I became more proud
My dad
To those who are closer to me than my soul
To those who shared my mother’s embrace and from whom I derive my pride and determination
My brothers
To those who made me forget my studies and shared my worries
In remembrance and appreciation
My friends
To this young and mighty scientific edifice
HADHRAMOUT University
I dedicate this humble effort



 
ACKNOWLEDGEMENTS


First and foremost, we would like to thank Allah Almighty for giving us strength, patience and ability to complete this project.

We would like to extend our sincere thanks to the supervisor of our project, Dr. Makarem Bamatraf for his help, suggestions, corrections, long-term guidance in support, the tremendous supervision and warm encouragement throughout our project.

We would like to express our appreciation to our colleagues, friends, lecturers, academic and general staff of the Faculty of Engineering and Petroleum, Hadhramout University. And we wish to extend our grateful appreciation to all those who had contributed directly and indirectly to the preparation of this project.

We would like to thank our beloved families for all support, patience, understanding, and being helpful throughout our study. Especially, we give our deepest gratitude and sincerest love to our parents for their love, support, encouragement, patience, and assistance through our entire life.

We are forever indebted to our parents, who always keep us in their prayers, encourage us to pursue higher goals and cheer us up in the difficult moments.


DECLARATION

We here declare that the work in this project is our own except for quotations and summaries which have been duly acknowledged. 
Date: 
Name
Registration number
Signature
Abdulrahman Amin Rubaia Bin Tayeb
20020511006

Omer Abdullah Mohammed Basloom
20020511017

Mohammed Saeed Omar Bahashwan
21020511014

Ahmed Saeed Mohmmed Bashkeel

20020511039


  



   

TABLE OF CONTENTS
DEDICATIONii
ACKNOWLEDGEMENTSiii
DECLARATIONiv
TABLE OF CONTENTSv
LIST OF TABLESvi
LIST OF FIGURESvii
LIST OF ABBREVIATIONviii
CHAPTER 11
INTRODUCTION1
1.1 Introduction1
1.2 Problem Statement1
1.3 Objectives1
The objectives of the project are as follows:1
1.4 Project Scope2
1.5 Structure of the Project2
CHAPTER 23
LITERATURE REVIEW3
2.1 Introduction3
2.2 Related Work3
2.3 Background5
CHAPTER 37
METHODOLOGY7
3.1 Introduction7
3.2 Analysis and Design7
REFERENCES12

LIST OF TABLES


LIST OF FIGURES 

Figure 2. 2.1 Robotic Cleaning Systems ……………………………………………………….3  
Figure 2. 2.2 IoT-Based Automated Solar Panel Cleaning and Monitoring Technique ……… 4 
Figure 2. 2.3 Drone-Based PV Solar Panel Cleaning and Washing Solution ………………….5
Figure 3. 2.1 Context  diagram ………………………………………………………………….7
Figure 3. 2.2 Arduino Mega ……………………………………………………………………..8
Figure 3. 2.3 Relay 5V………………………………………………………………………..….8
Figure 3. 2.4 Water Pump 12V  …………………………………………………………………9
Figure 3. 2.5 Sprayers …………………………………………………………………………...9
Figure 3. 2.6  Stepper Motor………………………………………………………………….…9
Figure 3. 2.7  . UltraSonic Sensor (HC-SR04)………………………………………………..10
Figure 3. 2.8  . ESP8266 Wi-Fi ………………………………………………………………10
Figure 3. 2.9  . Web Interface Using HTML………………………………………….………11









LIST OF ABBREVIATION
Abbreviation
Full Form
HTML
Hypertext Markup Language
CSS
Cascading Style Sheets
JS
JavaScript
HTTP
Hypertext Transfer Protocol
IP
Internet Protocol
UI
User Interface
Arduino Code
Arduino IDE


CHAPTER 1
INTRODUCTION
1.1 Introduction
Solar energy has become one of the most widely used renewable energy sources due to its availability, sustainability, and low operational cost. However, solar panels suffer from dust accumulation, which significantly reduces their efficiency—sometimes by up to 40% in desert environments. This highlights the need for an automated, reliable, and low‑cost cleaning system. This project aims to design and develop an automatic solar panel cleaning system using Arduino, equipped with a mobile sprayer mechanism and remote control functionality through a Wi‑Fi module.
1.2 Problem Statement
Dust, dirt, and environmental pollutants accumulate on solar panels and reduce their ability to absorb sunlight. Manual cleaning is labor‑intensive, costly, and sometimes unsafe, especially in large solar farms.
 Existing automated systems are often expensive or require high maintenance. Therefore, an affordable, efficient, and remotely controlled cleaning mechanism is required to maintain panel efficiency.
1.3 Objectives
The objectives of the project are as follows:  
1. To design and develop an automated solar panel cleaning system using Arduino.
2. To integrate a mobile sprayer mechanism capable of moving along the panel.
3. To implement remote control functionality using a Wi‑Fi module (ESP8266/ESP32).
4. To reduce human effort and maintenance costs.
5. To enhance solar panel efficiency by ensuring regular cleaning.
6. To test the proposed prototype and evaluate its performance.
1.4 Project Scope
This project focuses on designing an electronic control circuit using Arduino, implementing a movable sprayer mechanism, controlling the system through a Wi-Fi interface, and developing a simple web interface that allows remote operation. The prototype is tested on a single solar panel to evaluate its functionality and performance. However, the project does not include industrial-scale systems, large-scale deployment, mobile applications, or advanced IoT dashboards and cloud-based storage solutions.
1.5 Structure of the Project 
After we have taken an introduction and overview of our project in this chapter, the rest of the project report is organized as follows. Chapter two addresses a literature survey and an overview of the components used to build the proposed circuit.
Next, chapter three describes the methodology to describe the analysis and design stage, then it addresses the implementation stage and discusses the results.  Finally, chapter four introduces the main conclusions and suggested recommendation work of the project.

CHAPTER 2
 LITERATURE REVIEW
2.1 Introduction
This chapter presents previous work related to automated solar panel cleaning systems and provides the theoretical background necessary for understanding the proposed system.
2.2 Related Work
1. Robotic Cleaning Systems:
Several studies have proposed robotic systems that move across solar panels using brushes and motors. Despite their effectiveness, they are expensive and require frequent maintenance.
A study by Akyazi et al. (2019) presented the design and implementation of a solar panel cleaning robot aimed at automatically removing dust and dirt to improve energy generation efficiency. The robot consists of a control unit, a drive system with electric motors, and a cleaning system that includes a rotating brush and a water pump. Experimental results demonstrated effective cleaning performance, leading to an improvement in solar panel efficiency of up to 10%.[1]








Figure 2. 2.1 Robotic Cleaning Systems
2. IoT-Based Automated Solar Panel Cleaning and Monitoring Technique:
The objective of this research work is to design and develop an IoT-based automated solar panel cleaning and real-time monitoring system using a microcontroller to improve the output and efficiency of a solar module at a low cost. Despite the advantages offered by the proposed system, it has some drawbacks and challenges. The system relies heavily on the availability of a stable internet connection to enable real-time monitoring and control, which may limit its effectiveness in remote areas or regions with weak communication infrastructure. In addition, the use of multiple electronic components such as microcontrollers, sensors, and motors increases system complexity, leading to a higher probability of faults and the need for regular maintenance. Moreover, the accuracy of the Light Dependent Resistor (LDR) sensor can be affected by environmental factors such as variations in light intensity and weather conditions, which may result in inaccurate activation of the cleaning process. Although water and energy consumption are lower compared to traditional methods, they still pose challenges in areas with limited resources. Finally, the initial installation cost of the system may be a barrier to widespread adoption, particularly for small-scale projects or residential applications.[2]









Figure 2. 2.2 IoT-Based Automated Solar Panel Cleaning and Monitoring Technique
3. Drone-Based PV Solar Panel Cleaning and Washing Solution:
By utilizing the drone-based flexible high-pressure cleaning system for solar panels, the client can overcome the challenges posed by remote locations and harsh environments, achieving efficient cleaning of the solar panels. Although high-pressure drone-based solar panel cleaning systems are effective, they face several drawbacks. These include high initial costs for equipment and maintenance, limited operating time due to battery capacity and high energy consumption, and strong dependence on weather conditions such as wind and sandstorms. In addition, water consumption poses a challenge in desert regions, along with safety risks and the potential for panel damage in the event of system malfunction. Furthermore, the need for skilled technical personnel and the presence of regulatory and legal restrictions on drone operation may limit the widespread adoption of this system as a long-term solution.[3]







Figure 2. 2.3 Drone-Based PV Solar Panel Cleaning and Washing Solution
2.3 Background
The background information relevant to this project includes:
Automatic cleaning systems for solar panels are considered modern and effective solutions aimed at maintaining the efficiency of solar energy production. The accumulation of dust and dirt on the surface of solar panels reduces the amount of solar radiation reaching the panel, which negatively affects its efficiency and overall performance. Automatic cleaning systems rely on mechanical and electronic technologies that operate autonomously or can be controlled remotely to clean the panels without the need for continuous human intervention. This helps reduce maintenance costs and extend the operational lifespan of solar panels, especially in desert environments and areas with high dust levels. With the advancement of Internet of Things (IoT) technologies, it has become possible to monitor and control these systems remotely using wireless networks and simple web interfaces.
This project is based on the design and implementation of an automatic solar panel cleaning system using low-cost and easy-to-implement hardware and software components. From the hardware perspective, an Arduino microcontroller is used as the main control unit to manage and operate all system components. In addition, an ESP8266 or ESP32 module is employed to enable wireless communication via Wi-Fi and allow remote control of the system. DC motors or stepper motors are used to move the spraying mechanism linearly and accurately, along with a two-direction stepper motor to move the sprayers back and forth across the surface of the solar panel. A 12V water pump is used to pump water from the water tank to the sprayers, with its operation controlled through a relay.
Furthermore, a distance sensor is utilized to ensure precise control of the movement and positioning of the sprayers. Other components include connecting wires for linking the electronic circuits and water pipes to transfer water from the pump to two sprayers, which ensure even distribution of water over the solar panel surface. The solar panel is mounted on a dedicated base that provides stability during the cleaning process, while a base and track system is used to guide the smooth and controlled movement of the sprayers.
From the software perspective, the project relies on the development of a simple web interface using HTML and the HTTP protocol, which allows the user to remotely control the system, such as starting or stopping the cleaning process. This contributes to improved usability and enhanced system efficiency without the need for complex applications or advanced cloud-based platforms.


CHAPTER 3
METHODOLOGY 

3.1 Introduction
This chapter explains the methodology used to develop the system, including analysis of requirements, design of the hardware and software components, implementation, and testing of the prototype.

3.2 Analysis and Design
Context  diagram:

Figure 3. 2.1 Context  diagram



System Analysis:
The automatic solar panel cleaning system is designed as an integrated solution that combines electromechanical components with Internet of Things (IoT) technologies to achieve an efficient and reliable cleaning process. The system relies on the integration of hardware and software components to perform the cleaning operation either automatically or through remote control.
System Overview:
The system consists of three main subsystems: the control system, the mechanical and cleaning system, and the communication and software system. These subsystems work together to ensure precise movement, effective cleaning, and ease of user control.
Control System:
The control system is based on the Arduino microcontroller, which acts as the main processing unit of the system. It receives signals from sensors, processes the control logic, and sends operating commands to actuators such as motors and the water pump. The microcontroller also manages the operation sequence, including starting the cleaning cycle, controlling motor movements, and switching the water pump on or off through a relay.







Figure 3. 2.2 Arduino Mega                                                                       Figure 3. 2.3 Relay 5V

Mechanical and Cleaning System:
The mechanical system is responsible for physical movement and the cleaning process. DC stepper motors are used to move the spraying mechanism linearly and accurately. A two-direction stepper motor is utilized to move the sprayers back and forth across the surface of the solar panel, ensuring complete coverage of the panel surface. The cleaning process is carried out by spraying water using a 12V water pump, which draws water from the tank and distributes it through sprayers. Smooth motion is achieved using a base and track system, while a solar panel base provides stability during the cleaning process.






Figure 3. 2.4 Water Pump 12V                                                             Figure 3. 2.5 Sprayers






Figure 3. 2.6  Stepper Motor

Sensing and Safety System:
To ensure safe operation of the water pump, a distance sensor is used to monitor the water level inside the tank, ensuring that a sufficient amount of water is available to complete the cleaning process after the timer period ends. This sensor helps prevent mechanical errors, ensures uniform water distribution, enhances system reliability, and reduces unnecessary motor operation.





Figure 3. 2.7  . UltraSonic Sensor (HC-SR04)
Communication and Software System:
The communication system enables remote control via a Wi-Fi network using an ESP8266 or ESP32 module, through which user commands are received wirelessly. From the software perspective, a simple web interface developed using HTML and the HTTP protocol allows the user to control the system, such as starting or stopping the cleaning process, without the need for complex applications or advanced cloud-based services.





Figure 3. 2.8  . ESP8266 Wi-Fi












Figure 3. 2.9  . Web Interface Using HTML
System Operation:
When the user sends a command through the web interface, the wireless communication module receives the request and forwards it to the Arduino microcontroller. The microcontroller then executes the cleaning sequence by coordinating the operation of the motors and the water pump, relying on sensor data to ensure accurate movement. After the cleaning process is completed, the system automatically stops and waits for the next command.
System Advantages:
The system is characterized by its low cost, simplicity, and ease of implementation. It reduces reliance on manual labor, lowers maintenance costs, and improves the efficiency of solar panels. Additionally, remote control using simple technologies provides flexibility and ease of use, making the system suitable for small-scale applications and prototype implementations.

REFERENCES

[1] Akyazi, Ö., Şahin, E., Özsoy, T., & Algül, M. (2019). A solar panel cleaning robot design        and application. Avrupa Bilim ve Teknoloji Dergisi, 343-348.
[2]Shasoto Biswas, Muhibul Haque Bhuyan, Md Kamrul Hassan, September 2023. IoT-  Based Automated Solar Panel Cleaning and Monitoring Technique Journal of Engineering  Research and Reports Volume 25, Issue 8, Page 56-69.
 [3] As Ramoton Technology (2024). [we are a professional supplier of drone payloads, drone accessories] , [online], Accessed on [15 August 2025], Available on World Wide Web: https://www.drone-payload.com/drone-based-pv-solar-panel-cleaning-and-washing-solution/
[4] Manju B, Abdul Bari, Pavan C M (2018). [Automatic Solar Panel Cleaning System] , [online], Accessed on [22 December 2025], Available on World Wide Web:    https://doi.org/10.31695/IJASRE.2018.32778 
