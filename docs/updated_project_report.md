# AUTOMATIC BANNING WASHING SYSTEM
A FINAL PROJECT SUBMITTED IN PARTIAL FULFILMENT OF THE REQUIREMENTS FOR THE DEGREE OF BACHELOR OF ENGINEERING IN COMPUTER ENGINEERING 

**By**
- Abdulrahman Amin Rubaia Bin Tayeb
- Mohammed Saeed Omar Bahashwan
- Omer Abdullah Mohammed Basloom
- Ahmed Saeed Mohmmed Bashkeel

**SUPERVISOR**
Dr. MAKAREM BAMATRAF 

ALMUKALLA
DECEMBER 2025

---

## CHAPTER 1: INTRODUCTION

### 1.1 Introduction
Solar energy has become one of the most widely used renewable energy sources due to its availability, sustainability, and low operational cost. However, solar panels suffer from dust accumulation, which significantly reduces their efficiency—sometimes by up to 40% in desert environments. This highlights the need for an automated, reliable, and low-cost cleaning system. This project aims to design and develop an automatic solar panel cleaning system using Arduino, equipped with a mobile sprayer mechanism and remote control functionality through a Wi-Fi module.

### 1.2 Problem Statement
Dust, dirt, and environmental pollutants accumulate on solar panels and reduce their ability to absorb sunlight. Manual cleaning is labor-intensive, costly, and sometimes unsafe, especially in large solar farms. Existing automated systems are often expensive or require high maintenance. Therefore, an affordable, efficient, and remotely controlled cleaning mechanism is required to maintain panel efficiency.

### 1.3 Objectives
The objectives of the project are as follows:  
1. To design and develop an automated solar panel cleaning system using Arduino.
2. To integrate a mobile sprayer mechanism capable of moving along the panel.
3. To implement remote control functionality using a Wi-Fi module (ESP8266/ESP32).
4. To reduce human effort and maintenance costs.
5. To enhance solar panel efficiency by ensuring regular cleaning.
6. To test the proposed prototype and evaluate its performance.

### 1.4 Project Scope
This project focuses on designing an electronic control circuit using Arduino, implementing a movable sprayer mechanism, controlling the system through a Wi-Fi interface, and developing a modern web interface that allows remote operation. The prototype is tested on a single solar panel to evaluate its functionality and performance. However, the project does not include industrial-scale systems, large-scale deployment, mobile applications, or advanced IoT dashboards and cloud-based storage solutions.

### 1.5 Structure of the Project 
After we have taken an introduction and overview of our project in this chapter, the rest of the project report is organized as follows. Chapter two addresses a literature survey and an overview of the components used to build the proposed circuit. Next, chapter three describes the methodology to describe the analysis and design stage, then it addresses the implementation stage and discusses the results. Finally, chapter four introduces the main conclusions and suggested recommendation work of the project.

---

## CHAPTER 2: LITERATURE REVIEW

### 2.1 Introduction
This chapter presents previous work related to automated solar panel cleaning systems and provides the theoretical background necessary for understanding the proposed system.

### 2.2 Related Work
1. **Robotic Cleaning Systems:** Several studies have proposed robotic systems that move across solar panels using brushes and motors. Despite their effectiveness, they are expensive and require frequent maintenance. A study by Akyazi et al. (2019) presented the design and implementation of a solar panel cleaning robot aimed at automatically removing dust and dirt to improve energy generation efficiency. Experimental results demonstrated effective cleaning performance, leading to an improvement in solar panel efficiency of up to 10%.

2. **IoT-Based Automated Solar Panel Cleaning and Monitoring Technique:** The objective of this research work is to design and develop an IoT-based automated solar panel cleaning and real-time monitoring system using a microcontroller to improve the output and efficiency of a solar module at a low cost. Despite the advantages, it has challenges such as reliance on a stable internet connection and environmental factors affecting sensors.

3. **Drone-Based PV Solar Panel Cleaning and Washing Solution:** By utilizing the drone-based flexible high-pressure cleaning system, challenges posed by remote locations can be overcome. However, these systems face high initial costs, limited operating times due to battery capacity, and strong dependence on weather conditions.

### 2.3 Background
Automatic cleaning systems for solar panels are modern and effective solutions aimed at maintaining the efficiency of solar energy production. The accumulation of dust and dirt on the surface reduces the amount of solar radiation reaching the panel, which negatively affects its efficiency and overall performance.

This project is based on the design and implementation of an automatic solar panel cleaning system using low-cost and easy-to-implement hardware and software components. From the hardware perspective, an Arduino Mega microcontroller is used as the main control unit to manage and operate all system components. In addition, an ESP8266 (ESP-01) module is employed to enable wireless communication via Wi-Fi and allow remote control of the system. **TT DC Motors (1:48 Gearbox)** controlled via **L298N H-Bridge drivers** are used to move the spraying mechanism and sprayers smoothly and accurately across the surface of the solar panel. A 12V water pump is used to pump water from the water tank to the sprayers, with its operation controlled through a relay.

Furthermore, an ultrasonic distance sensor is utilized to monitor the water level, and **Limit Switches** are incorporated to detect the home position and prevent the motors from over-traveling. Other components include connecting wires for linking the electronic circuits and water pipes to transfer water from the pump to sprayers.

From the software perspective, the project relies on the development of a **modern, minimalist web application utilizing React and Vite**. This interface allows the user to remotely control the system in real-time using JSON packets over MQTT. This contributes to improved usability and enhanced system efficiency with a premium mobile-first user experience.

---

## CHAPTER 3: METHODOLOGY 

### 3.1 Introduction
This chapter explains the methodology used to develop the system, including analysis of requirements, design of the hardware and software components, implementation, and testing of the prototype.

### 3.2 Analysis and Design

**System Analysis:**
The automatic solar panel cleaning system is designed as an integrated solution that combines electromechanical components with Internet of Things (IoT) technologies. The system relies on the integration of hardware and software components to perform the cleaning operation either automatically or through remote control.

**System Overview:**
The system consists of three main subsystems: the control system, the mechanical and cleaning system, and the communication and software system.

**Control System:**
The control system is based on the Arduino Mega microcontroller, which acts as the main processing unit of the system. It receives signals from sensors, processes the control logic, and sends operating commands to actuators such as the TT DC motors (via L298N) and the water pump (via Relay). The microcontroller also manages the operation sequence, including starting the cleaning cycle and communicating with the ESP-01 module over Serial.

**Mechanical and Cleaning System:**
The mechanical system is responsible for physical movement and the cleaning process. **TT DC Motors (1:48 Gearbox)** managed by **L298N H-Bridge modules** are used to drive the spraying mechanism and move the sprayers accurately across the solar panel surface. The cleaning process is carried out by spraying water using a 12V water pump, which draws water from the tank and distributes it through sprayers. Smooth motion is achieved using a base and track system.

**Sensing and Safety System:**
To ensure safe operation of the water pump, an ultrasonic distance sensor (HC-SR04) is used to monitor the water level inside the tank, ensuring that a sufficient amount of water is available to complete the cleaning process. Additionally, **Limit Switches** are positioned at the ends of the tracks. These active-low switches securely detect the home position of the cleaning units, preventing mechanical collisions and ensuring the motors stop exactly when they complete their cycle.

**Communication and Software System:**
The communication system enables remote control via a Wi-Fi network using an ESP8266 (ESP-01) module. From the software perspective, a modern, mobile-first web interface developed using React provides a rich user experience. It utilizes MQTT and JSON protocols to securely transmit control commands (such as starting or stopping the cleaning process) and display real-time telemetry like central water levels and unit states (e.g., CLEANING, RETURNING_HOME).

**System Operation:**
When the user sends a command through the web interface, the wireless communication module receives the request and forwards it to the Arduino microcontroller via Serial JSON packets. The microcontroller then executes the cleaning sequence by coordinating the operation of the TT DC motors and the water pump, relying on limit switches and sensor data to ensure accurate movement. After the cleaning process is completed, the system automatically returns to home and waits for the next command.

**System Advantages:**
The system is characterized by its low cost, simplicity, and ease of implementation. It reduces reliance on manual labor, lowers maintenance costs, and improves the efficiency of solar panels. Additionally, remote control using a modern React-based UI provides a premium user experience and high reliability.

---
*(Note: Be sure to update your List of Figures in your Word document to change "Figure 3.2.6 Stepper Motor" to "Figure 3.2.6 TT DC Motor 1:48 Gearbox")*
