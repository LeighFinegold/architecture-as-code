# Block Architecture — Navigation Example (Permutation Test)

This page demonstrates **Mermaid diagrams with clickable nodes** and many permutations.
⚠️ Note: GitHub issue rendering ignores `click`, but if you copy/paste into a `.mmd` file or a markdown site with Mermaid enabled, clicking works.

---

## 0) Baseline (Flat, neighbors, with interfaces)

```mermaid
%%{init: {"flowchart": {"htmlLabels": false}}}%%
flowchart TB
classDef boundary fill:#f8fafc,stroke:#64748b,stroke-dasharray: 5 4,stroke-width:2px,color:#000;
classDef node fill:#ffffff,stroke:#1f2937,stroke-width:1px,color:#000;
classDef iface fill:#f1f5f9,stroke:#64748b,stroke-width:1px,font-size:10px,color:#000;
classDef highlight fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,color:#000;


    message-bus["Message Bus"]:::node
        message-bus__iface__trade-events-topic["◻ Trade Events Topic"]:::iface
    trade-svc["Trade Service"]:::node
        trade-svc__iface__api["◻ API: /trades"]:::iface
        trade-svc__iface__jdbc["◻ JDBC: trading-db"]:::iface
        trade-svc__iface__events["◻ Topic: trade.events"]:::iface
    trading-db["Trading DB"]:::node
        trading-db__iface__sql["◻ SQL Interface"]:::iface
    trading-ui["Trading UI"]:::node
        trading-ui__iface__web-ui["◻ Web Interface"]:::iface

    trading-ui__iface__web-ui -->|Place Trade| trade-svc__iface__api
    trade-svc__iface__jdbc -->|Persist| trading-db__iface__sql
    trade-svc__iface__events -->|Publish Events| message-bus__iface__trade-events-topic

    trading-ui -.- trading-ui__iface__web-ui
    trade-svc -.- trade-svc__iface__api
    trade-svc -.- trade-svc__iface__jdbc
    trade-svc -.- trade-svc__iface__events
    trading-db -.- trading-db__iface__sql
    message-bus -.- message-bus__iface__trade-events-topic

    class trade-svc highlight
    class trading-ui highlight
    class trading-db highlight
    class message-bus highlight

```

---

## 1) Flat, neighbors, **no** interfaces

```mermaid
%%{init: {"flowchart": {"htmlLabels": false}}}%%
flowchart TB
classDef boundary fill:#f8fafc,stroke:#64748b,stroke-dasharray: 5 4,stroke-width:2px,color:#000;
classDef node fill:#ffffff,stroke:#1f2937,stroke-width:1px,color:#000;
classDef iface fill:#f1f5f9,stroke:#64748b,stroke-width:1px,font-size:10px,color:#000;
classDef highlight fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,color:#000;


    message-bus["Message Bus"]:::node
    trade-svc["Trade Service"]:::node
    trading-db["Trading DB"]:::node
    trading-ui["Trading UI"]:::node

    trading-ui -->|Place Trade| trade-svc
    trade-svc -->|Persist| trading-db
    trade-svc -->|Publish Events| message-bus


    class trade-svc highlight
    class trading-ui highlight
    class trading-db highlight
    class message-bus highlight

```

---

## 2) Immediate container context (parents), neighbors, with interfaces

```mermaid
%%{init: {"flowchart": {"htmlLabels": false}}}%%
flowchart TB
classDef boundary fill:#f8fafc,stroke:#64748b,stroke-dasharray: 5 4,stroke-width:2px,color:#000;
classDef node fill:#ffffff,stroke:#1f2937,stroke-width:1px,color:#000;
classDef iface fill:#f1f5f9,stroke:#64748b,stroke-width:1px,font-size:10px,color:#000;
classDef highlight fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,color:#000;



    trading-ui__iface__web-ui -->|Place Trade| trade-svc__iface__api
    trade-svc__iface__jdbc -->|Persist| trading-db__iface__sql
    trade-svc__iface__events -->|Publish Events| message-bus__iface__trade-events-topic

    trading-ui -.- trading-ui__iface__web-ui
    trade-svc -.- trade-svc__iface__api
    trade-svc -.- trade-svc__iface__jdbc
    trade-svc -.- trade-svc__iface__events
    trading-db -.- trading-db__iface__sql
    message-bus -.- message-bus__iface__trade-events-topic

    class trade-svc highlight
    class trading-ui highlight
    class trading-db highlight
    class message-bus highlight

```

---

## 3) Parents, neighbors, **no interfaces** (cleaner context)

```mermaid
%%{init: {"flowchart": {"htmlLabels": false}}}%%
flowchart TB
classDef boundary fill:#f8fafc,stroke:#64748b,stroke-dasharray: 5 4,stroke-width:2px,color:#000;
classDef node fill:#ffffff,stroke:#1f2937,stroke-width:1px,color:#000;
classDef iface fill:#f1f5f9,stroke:#64748b,stroke-width:1px,font-size:10px,color:#000;
classDef highlight fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,color:#000;



    trading-ui -->|Place Trade| trade-svc
    trade-svc -->|Persist| trading-db
    trade-svc -->|Publish Events| message-bus


    class trade-svc highlight
    class trading-ui highlight
    class trading-db highlight
    class message-bus highlight

```

---

## 4) All containers (ecosystem shells), neighbors, with interfaces

```mermaid
%%{init: {"flowchart": {"htmlLabels": false}}}%%
flowchart TB
classDef boundary fill:#f8fafc,stroke:#64748b,stroke-dasharray: 5 4,stroke-width:2px,color:#000;
classDef node fill:#ffffff,stroke:#1f2937,stroke-width:1px,color:#000;
classDef iface fill:#f1f5f9,stroke:#64748b,stroke-width:1px,font-size:10px,color:#000;
classDef highlight fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,color:#000;

        subgraph enterprise-bank["Enterprise Bank"]
        direction TB
                subgraph messaging-system["Messaging System"]
                direction TB
                    message-bus["Message Bus"]:::node
                        message-bus__iface__trade-events-topic["◻ Trade Events Topic"]:::iface
                end
                class messaging-system boundary
                subgraph trading-system["Trading System"]
                direction TB
                    trade-svc["Trade Service"]:::node
                        trade-svc__iface__api["◻ API: /trades"]:::iface
                        trade-svc__iface__jdbc["◻ JDBC: trading-db"]:::iface
                        trade-svc__iface__events["◻ Topic: trade.events"]:::iface
                    trading-db["Trading DB"]:::node
                        trading-db__iface__sql["◻ SQL Interface"]:::iface
                    trading-ui["Trading UI"]:::node
                        trading-ui__iface__web-ui["◻ Web Interface"]:::iface
                end
                class trading-system boundary
        end
        class enterprise-bank boundary


    trading-ui__iface__web-ui -->|Place Trade| trade-svc__iface__api
    trade-svc__iface__jdbc -->|Persist| trading-db__iface__sql
    trade-svc__iface__events -->|Publish Events| message-bus__iface__trade-events-topic

    trading-ui -.- trading-ui__iface__web-ui
    trade-svc -.- trade-svc__iface__api
    trade-svc -.- trade-svc__iface__jdbc
    trade-svc -.- trade-svc__iface__events
    trading-db -.- trading-db__iface__sql
    message-bus -.- message-bus__iface__trade-events-topic

    class trade-svc highlight
    class trading-ui highlight
    class trading-db highlight
    class message-bus highlight
                        click message-bus "#message-bus" "Jump to Message Bus"
                            click message-bus__iface__trade-events-topic "#message-bus__iface__trade-events-topic" "Jump to ◻ Trade Events Topic"
                                        click trade-svc "#trade-service" "Jump to Trade Service"
                            click trade-svc__iface__api "#trade-service-api" "Jump to ◻ API: /trades"
                            click trade-svc__iface__jdbc "#trade-service-storage" "Jump to ◻ JDBC: trading-db"
                            click trade-svc__iface__events "#trade-service-events" "Jump to ◻ Topic: trade.events"
                        click trading-db "#trading-db" "Jump to Trading DB"
                            click trading-db__iface__sql "#trading-db__iface__sql" "Jump to ◻ SQL Interface"
                                click trading-ui "#trading-ui" "Jump to Trading UI"
                            click trading-ui__iface__web-ui "#trading-ui__iface__web-ui" "Jump to ◻ Web Interface"
                        
```

---

## 5) All containers (ecosystem shells), neighbors, **no interfaces**

```mermaid
%%{init: {"flowchart": {"htmlLabels": false}}}%%
flowchart TB
classDef boundary fill:#f8fafc,stroke:#64748b,stroke-dasharray: 5 4,stroke-width:2px,color:#000;
classDef node fill:#ffffff,stroke:#1f2937,stroke-width:1px,color:#000;
classDef iface fill:#f1f5f9,stroke:#64748b,stroke-width:1px,font-size:10px,color:#000;
classDef highlight fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,color:#000;

        subgraph enterprise-bank["Enterprise Bank"]
        direction TB
                subgraph messaging-system["Messaging System"]
                direction TB
                    message-bus["Message Bus"]:::node
                end
                class messaging-system boundary
                subgraph trading-system["Trading System"]
                direction TB
                    trade-svc["Trade Service"]:::node
                    trading-db["Trading DB"]:::node
                    trading-ui["Trading UI"]:::node
                end
                class trading-system boundary
        end
        class enterprise-bank boundary


    trading-ui -->|Place Trade| trade-svc
    trade-svc -->|Persist| trading-db
    trade-svc -->|Publish Events| message-bus


    class trade-svc highlight
    class trading-ui highlight
    class trading-db highlight
    class message-bus highlight
                        click message-bus "#message-bus" "Jump to Message Bus"
                        click trade-svc "#trade-service" "Jump to Trade Service"
                        click trading-db "#trading-db" "Jump to Trading DB"
                        click trading-ui "#trading-ui" "Jump to Trading UI"

```

---

## 7) System slice (explicit): focus trading-system, children + neighbors

```mermaid
%%{init: {"flowchart": {"htmlLabels": false}}}%%
flowchart TB
classDef boundary fill:#f8fafc,stroke:#64748b,stroke-dasharray: 5 4,stroke-width:2px,color:#000;
classDef node fill:#ffffff,stroke:#1f2937,stroke-width:1px,color:#000;
classDef iface fill:#f1f5f9,stroke:#64748b,stroke-width:1px,font-size:10px,color:#000;
classDef highlight fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,color:#000;


    message-bus["Message Bus"]:::node
    trade-svc["Trade Service"]:::node
    trading-db["Trading DB"]:::node
    trading-system["Trading System"]:::node
    trading-ui["Trading UI"]:::node

    trading-ui -->|Place Trade| trade-svc
    trade-svc -->|Persist| trading-db
    trade-svc -->|Publish Events| message-bus


    class trading-system highlight

```

> **Explicit system view**: `include-containers="none"`, `include-children="all"`, `edges="connected"`.

---

## 8) Details slice (explicit): focus trade-svc, interfaces + neighbors

```mermaid
%%{init: {"flowchart": {"htmlLabels": false}}}%%
flowchart TB
classDef boundary fill:#f8fafc,stroke:#64748b,stroke-dasharray: 5 4,stroke-width:2px,color:#000;
classDef node fill:#ffffff,stroke:#1f2937,stroke-width:1px,color:#000;
classDef iface fill:#f1f5f9,stroke:#64748b,stroke-width:1px,font-size:10px,color:#000;
classDef highlight fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,color:#000;


    message-bus["Message Bus"]:::node
        message-bus__iface__trade-events-topic["◻ Trade Events Topic"]:::iface
    trade-svc["Trade Service"]:::node
        trade-svc__iface__api["◻ API: /trades"]:::iface
        trade-svc__iface__jdbc["◻ JDBC: trading-db"]:::iface
        trade-svc__iface__events["◻ Topic: trade.events"]:::iface
    trading-db["Trading DB"]:::node
        trading-db__iface__sql["◻ SQL Interface"]:::iface
    trading-ui["Trading UI"]:::node
        trading-ui__iface__web-ui["◻ Web Interface"]:::iface

    trading-ui__iface__web-ui -->|Place Trade| trade-svc__iface__api
    trade-svc__iface__jdbc -->|Persist| trading-db__iface__sql
    trade-svc__iface__events -->|Publish Events| message-bus__iface__trade-events-topic

    trading-ui -.- trading-ui__iface__web-ui
    trade-svc -.- trade-svc__iface__api
    trade-svc -.- trade-svc__iface__jdbc
    trade-svc -.- trade-svc__iface__events
    trading-db -.- trading-db__iface__sql
    message-bus -.- message-bus__iface__trade-events-topic

    class trade-svc highlight

```

> **Explicit details view**: flat + interfaces + neighbors.

---

## 9) Focus on **UI** only, flat, neighbors, interfaces off (just to vary)

```mermaid
%%{init: {"flowchart": {"htmlLabels": false}}}%%
flowchart TB
classDef boundary fill:#f8fafc,stroke:#64748b,stroke-dasharray: 5 4,stroke-width:2px,color:#000;
classDef node fill:#ffffff,stroke:#1f2937,stroke-width:1px,color:#000;
classDef iface fill:#f1f5f9,stroke:#64748b,stroke-width:1px,font-size:10px,color:#000;
classDef highlight fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,color:#000;


    trade-svc["Trade Service"]:::node
    trading-ui["Trading UI"]:::node

    trading-ui -->|Place Trade| trade-svc


    class trading-ui highlight

```

---

## 10) Focus on **DB** only, parents containers, neighbors, with interfaces

```mermaid
%%{init: {"flowchart": {"htmlLabels": false}}}%%
flowchart TB
classDef boundary fill:#f8fafc,stroke:#64748b,stroke-dasharray: 5 4,stroke-width:2px,color:#000;
classDef node fill:#ffffff,stroke:#1f2937,stroke-width:1px,color:#000;
classDef iface fill:#f1f5f9,stroke:#64748b,stroke-width:1px,font-size:10px,color:#000;
classDef highlight fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,color:#000;



    trade-svc__iface__jdbc -->|Persist| trading-db__iface__sql

    trade-svc -.- trade-svc__iface__api
    trade-svc -.- trade-svc__iface__jdbc
    trade-svc -.- trade-svc__iface__events
    trading-db -.- trading-db__iface__sql

    class trading-db highlight

```

---

## 11) Flat slice with **edges off** (structure with attachments only)

```mermaid
%%{init: {"flowchart": {"htmlLabels": false}}}%%
flowchart TB
classDef boundary fill:#f8fafc,stroke:#64748b,stroke-dasharray: 5 4,stroke-width:2px,color:#000;
classDef node fill:#ffffff,stroke:#1f2937,stroke-width:1px,color:#000;
classDef iface fill:#f1f5f9,stroke:#64748b,stroke-width:1px,font-size:10px,color:#000;
classDef highlight fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,color:#000;


    message-bus["Message Bus"]:::node
        message-bus__iface__trade-events-topic["◻ Trade Events Topic"]:::iface
    trade-svc["Trade Service"]:::node
        trade-svc__iface__api["◻ API: /trades"]:::iface
        trade-svc__iface__jdbc["◻ JDBC: trading-db"]:::iface
        trade-svc__iface__events["◻ Topic: trade.events"]:::iface
    trading-db["Trading DB"]:::node
        trading-db__iface__sql["◻ SQL Interface"]:::iface
    trading-ui["Trading UI"]:::node
        trading-ui__iface__web-ui["◻ Web Interface"]:::iface


    trading-ui -.- trading-ui__iface__web-ui
    trade-svc -.- trade-svc__iface__api
    trade-svc -.- trade-svc__iface__jdbc
    trade-svc -.- trade-svc__iface__events
    trading-db -.- trading-db__iface__sql
    message-bus -.- message-bus__iface__trade-events-topic

    class trade-svc highlight
    class trading-ui highlight
    class trading-db highlight
    class message-bus highlight

```

---

# Details (Anchor Targets)

## Trading System
Some notes about the **Trading System**.

## Position System
Some notes about the **Position System**.

## Messaging System
Some notes about the **Messaging System**.

## Trading UI
Details about **Trading UI**.

## Trade Service
Details about **Trade Service**.

### Trade Service API
Details about the **API interface**.

### Trade Service Storage
Details about the **storage interface**.

### Trade Service Events
Details about the **events interface**.

## Trading DB
Details about **Trading DB**.

## Message Bus
Details about **Message Bus**.