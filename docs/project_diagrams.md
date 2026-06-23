# Automatic Banning Washing System - Technical Diagrams

This document contains all the necessary diagrams for the project report. You can view them directly here, or copy the Mermaid code blocks into tools like [Mermaid Live Editor](https://mermaid.live/) or directly into markdown-supported platforms to generate high-resolution images for your Word document.

---

## 1. Use Case Diagram
*Represents the interactions between the users (Admin/Operator) and the system.*

```mermaid
flowchart LR
    %% Actors
    Admin((Admin / Operator))
    System((Hardware System))

    %% Use Cases
    subgraph Web Application
        UC1([Login / Authenticate])
        UC2([View Dashboard & Water Level])
        UC3([Start/Stop Cleaning Manually])
        UC4([Configure Automatic Schedule])
        UC5([View Cleaning Logs])
    end

    %% Relationships
    Admin --> UC1
    Admin --> UC2
    Admin --> UC3
    Admin --> UC4
    Admin --> UC5

    UC3 <--> |MQTT Commands| System
    UC2 <--> |Telemetry Data| System
```

---

## 2. Context Diagram
*Shows the system as a whole interacting with external entities (Level 0 DFD).*

```mermaid
flowchart TD
    User((User / Operator))
    Broker((MQTT Cloud Broker))
    Water[Water Tank]
    Panels[Solar Panels]

    subgraph System
        ABWS[Automatic Banning Washing System]
    end

    User -- "Sends Commands & Views Status" --> Broker
    Broker -- "JSON Packets" --> ABWS
    ABWS -- "Telemetry & States" --> Broker
    Water -- "Supplies Water" --> ABWS
    ABWS -- "Sprays Water & Brushes" --> Panels
```

---

## 3. System Architecture Diagram
*High-level overview of how the frontend, connectivity, and hardware are linked.*

```mermaid
flowchart LR
    subgraph Frontend [User Interface]
        WebApp[React.js Web App]
    end

    subgraph Cloud [Connectivity]
        MQTT[MQTT Broker]
    end

    subgraph Hardware [Embedded System]
        ESP[ESP-01 Wi-Fi Module]
        Mega[Arduino Mega 2560]
        Motors[TT DC Motors 1:48]
        Pump[12V Water Pump]
    end

    WebApp <--> |Publish/Subscribe| MQTT
    MQTT <--> |Wi-Fi / TCP| ESP
    ESP <--> |Serial UART JSON| Mega
    Mega --> |L298N PWM| Motors
    Mega --> |Relay 5V| Pump
```

---

## 4. Hardware Architecture Diagram
*Detailed wiring and hardware components connected to the Arduino.*

```mermaid
graph TD
    Arduino[Arduino Mega 2560]

    Arduino -- "Serial1 (RX/TX)" --- ESP[ESP-01 Wi-Fi Module]
    
    Arduino -- "Digital Pins" --- L298N[L298N Motor Driver]
    L298N -- "12V Power" --- Motor1((TT Motor 1))
    L298N -- "12V Power" --- Motor2((TT Motor 2))
    
    Arduino -- "Digital Pin (Active LOW)" --- Relay[5V Relay Module]
    Relay -- "12V Power" --- Pump((12V Water Pump))

    Arduino -- "Trigger/Echo" --- Sonic[HC-SR04 Ultrasonic Sensor]
    
    Arduino -- "Digital Pins (INPUT_PULLUP)" --- LS1[Home Limit Switch]
    Arduino -- "Digital Pins (INPUT_PULLUP)" --- LS2[End Limit Switch]
    
    Power[12V Power Supply] --> L298N
    Power --> Relay
    Power -- "Buck Converter 5V" --> Arduino
```

---

## 5. Software Architecture Diagram
*Internal software modules and communication logic.*

```mermaid
flowchart TB
    subgraph React App
        UI[UI Components]
        State[React Context / State]
        MQTT_Client[MQTT.js Client]
        
        UI <--> State
        State <--> MQTT_Client
    end

    subgraph ESP Firmware
        WiFi_Lib[ESP8266WiFi]
        PubSub[PubSubClient]
        Serial_Comm[HardwareSerial]
        
        PubSub <--> WiFi_Lib
        PubSub <--> Serial_Comm
    end

    subgraph Arduino Firmware
        Arduino_JSON[ArduinoJson Library]
        Motor_Control[Motor Control Logic]
        Sensor_Read[Ultrasonic/Limit Logic]
        Main_Loop[State Machine Loop]

        Arduino_JSON <--> Main_Loop
        Main_Loop <--> Motor_Control
        Main_Loop <--> Sensor_Read
    end

    MQTT_Client -.-> |Internet| PubSub
    Serial_Comm -.-> |UART| Arduino_JSON
```

---

## 6. ER Diagram (Logical) & 7. Database Diagram (Physical)
*These represent the data structures used by the application to store users, units, and logs.*

```mermaid
erDiagram
    USER {
        int user_id PK
        varchar username
        varchar password_hash
        varchar role
        datetime created_at
    }

    CLEANING_UNIT {
        int unit_id PK
        varchar name
        varchar status
        float water_level
        boolean is_active
    }

    CLEANING_LOG {
        int log_id PK
        int unit_id FK
        int user_id FK
        datetime triggered_at
        varchar result_status
    }

    USER ||--o{ CLEANING_LOG : "generates"
    CLEANING_UNIT ||--o{ CLEANING_LOG : "records"
```

---

## 8. MQTT Communication Diagram
*Shows the specific topics and payload directions.*

```mermaid
sequenceDiagram
    participant Web as Web Dashboard
    participant Broker as MQTT Broker
    participant ESP as ESP-01 Module

    Note over Web,ESP: Topics: abw/control, abw/status
    
    ESP->>Broker: Subscribe to "abw/control"
    Web->>Broker: Subscribe to "abw/status"
    
    Web->>Broker: Publish: {"action":"start", "unit":1} -> abw/control
    Broker->>ESP: Deliver: {"action":"start", "unit":1}
    
    Note over ESP: Arduino processes command
    
    ESP->>Broker: Publish: {"unit":1, "status":"CLEANING"} -> abw/status
    Broker->>Web: Deliver: {"unit":1, "status":"CLEANING"}
```

---

## 9. Activity Diagram
*The workflow of a single cleaning cycle.*

```mermaid
stateDiagram-v2
    [*] --> Idle
    
    Idle --> CheckingWater : Start Command Received
    
    CheckingWater --> WaterLowError : Water < 20%
    WaterLowError --> Idle : Abort
    
    CheckingWater --> CleaningForward : Water OK
    
    CleaningForward --> CleaningForward : Moving Forward + Spraying
    CleaningForward --> ReverseTriggered : Hits End Limit Switch
    
    ReverseTriggered --> ReturningHome : Stop Spraying, Reverse Motors
    ReturningHome --> ReturningHome : Moving Backward
    ReturningHome --> CycleComplete : Hits Home Limit Switch
    
    CycleComplete --> Idle : Update Status to IDLE
```

---

## 10. Sequence Diagram
*Step-by-step execution timeline from User click to Hardware action.*

```mermaid
sequenceDiagram
    actor User
    participant Web as Web Interface
    participant MQTT as MQTT Broker
    participant ESP as ESP-01
    participant Arduino as Arduino Mega
    participant Hardware as Motors/Pump

    User->>Web: Clicks "Start Cleaning"
    Web->>MQTT: Publish {"command":"start"} (abw/control)
    MQTT->>ESP: Forward Payload
    ESP->>Arduino: Serial1.println('{"command":"start"}')
    
    Arduino->>Arduino: Parse JSON
    Arduino->>Hardware: Relay ON (Pump)
    Arduino->>Hardware: L298N ON (Motors Forward)
    
    Arduino->>ESP: Serial1.println('{"status":"CLEANING"}')
    ESP->>MQTT: Publish {"status":"CLEANING"} (abw/status)
    MQTT->>Web: Forward Payload
    Web->>User: Updates UI to "Cleaning..."
    
    Note over Hardware,Arduino: ... Time Passes / Reaches End ...
    
    Hardware-->>Arduino: Limit Switch Triggered
    Arduino->>Hardware: L298N Reverse (Motors Backward)
    
    Note over Hardware,Arduino: ... Reaches Home ...
    
    Hardware-->>Arduino: Home Switch Triggered
    Arduino->>Hardware: Relay OFF, Motors OFF
    
    Arduino->>ESP: Serial1.println('{"status":"IDLE"}')
    ESP->>MQTT: Publish {"status":"IDLE"} (abw/status)
    MQTT->>Web: Forward Payload
    Web->>User: Updates UI to "Ready/Idle"
```
