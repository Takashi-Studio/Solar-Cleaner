# Entity-Relationship Diagram (ERD)

This diagram outlines the database structure and logical entities for the Automatic Banning Washing System (Solar Panel Cleaner).

```mermaid
erDiagram
    USER {
        int UserID PK
        string Username
        string PasswordHash
        string Role "e.g., Admin, Operator"
        datetime CreatedAt
    }

    CLEANING_UNIT {
        int UnitID PK
        string Name "e.g., Unit A"
        string Status "CLEANING, IDLE, ERROR"
        datetime LastCleaned
        string MAC_Address
        boolean IsActive
    }

    WATER_TANK {
        int TankID PK
        float CurrentLevel "Percentage 0-100%"
        float CapacityLiters
        string Status "NORMAL, LOW, CRITICAL"
    }

    CLEANING_LOG {
        int LogID PK
        int UnitID FK
        int UserID FK "Triggered By"
        datetime StartTime
        datetime EndTime
        string Status "SUCCESS, FAILED, INTERRUPTED"
        string Notes
    }

    SCHEDULE {
        int ScheduleID PK
        int UnitID FK
        time ScheduledTime
        string DaysOfWeek "e.g., Mon, Wed, Fri"
        boolean IsEnabled
    }

    %% Relationships
    USER ||--o{ CLEANING_LOG : "triggers"
    CLEANING_UNIT ||--o{ CLEANING_LOG : "has"
    CLEANING_UNIT ||--o{ SCHEDULE : "follows"
    WATER_TANK ||--o{ CLEANING_UNIT : "supplies water to"

```

### Entities Description:
1. **USER**: Stores credentials and roles for logging into the web dashboard.
2. **CLEANING_UNIT**: Represents each independent cleaning mechanism (the hardware units controlled by Arduino/ESP).
3. **WATER_TANK**: Represents the central water tank monitoring (using the Ultrasonic sensor).
4. **CLEANING_LOG**: Records the history of every cleaning operation, whether successful or failed, and who started it.
5. **SCHEDULE**: Stores automated cleaning schedules for the units.
