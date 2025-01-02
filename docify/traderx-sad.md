# TraderX
TraderX CALM Architecture

## Architecture
```mermaid
    C4Container
    title Container diagram for Internet Banking System

    System_Ext(email_system, "E-Mail System", "The internal Microsoft Exchange system", $tags="v1.0")
    Person(customer, Customer, "A customer of the bank, with personal bank accounts", $tags="v1.0")

    Container_Boundary(c1, "Internet Banking") {
        Container(spa, "Single-Page App", "JavaScript, Angular", "Provides all the Internet banking functionality to customers via their web browser")
        Container_Ext(mobile_app, "Mobile App", "C#, Xamarin", "Provides a limited subset of the Internet banking functionality to customers via their mobile device")
        Container(web_app, "Web Application", "Java, Spring MVC", "Delivers the static content and the Internet banking SPA")
        ContainerDb(database, "Database", "SQL Database", "Stores user registration information, hashed auth credentials, access logs, etc.")
        ContainerDb_Ext(backend_api, "API Application", "Java, Docker Container", "Provides Internet banking functionality via API")

    }

    System_Ext(banking_system, "Mainframe Banking System", "Stores all of the core banking information about customers, accounts, transactions, etc.")

    Rel(customer, web_app, "Uses", "HTTPS")
    UpdateRelStyle(customer, web_app, $offsetY="60", $offsetX="90")
    Rel(customer, spa, "Uses", "HTTPS")
    UpdateRelStyle(customer, spa, $offsetY="-40")
    Rel(customer, mobile_app, "Uses")
    UpdateRelStyle(customer, mobile_app, $offsetY="-30")

    Rel(web_app, spa, "Delivers")
    UpdateRelStyle(web_app, spa, $offsetX="130")
    Rel(spa, backend_api, "Uses", "async, JSON/HTTPS")
    Rel(mobile_app, backend_api, "Uses", "async, JSON/HTTPS")
    Rel_Back(database, backend_api, "Reads from and writes to", "sync, JDBC")

    Rel(email_system, customer, "Sends e-mails to")
    UpdateRelStyle(email_system, customer, $offsetX="-45")
    Rel(backend_api, email_system, "Sends e-mails using", "sync, SMTP")
    UpdateRelStyle(backend_api, email_system, $offsetY="-60")
    Rel(backend_api, banking_system, "Uses", "sync/async, XML/HTTPS")
    UpdateRelStyle(backend_api, banking_system, $offsetY="-50", $offsetX="-140")
```

## Flows
### Add or Update Account

Flow for adding or updating account information in the database.

```mermaid
sequenceDiagram
        web-gui-process ->> accounts-service: Submit Account Create/Update
        accounts-service ->> traderx-db: inserts or updates account
        accounts-service -->> web-gui-process: Returns Account Create/Update Response Status
```
### Load List of Accounts

Flow for loading a list of accounts from the database to populate the GUI drop-down for user account selection.

```mermaid
sequenceDiagram
        web-gui-process ->> accounts-service: Load list of accounts
        accounts-service ->> traderx-db: Query for all Accounts
        traderx-db -->> accounts-service: Returns list of accounts
        accounts-service -->> web-gui-process: Returns list of accounts
```
### Load Positions

Flow for loading positions for a specific account and subscribing to updates.

```mermaid
sequenceDiagram
        web-gui-process ->> position-service: Load Positions (acc)
        position-service ->> traderx-db: Query Positions for Account
        traderx-db -->> position-service: Return Positions for Account
        position-service -->> web-gui-process: Return Positions for Account
        Unknown Source ->> Unknown Destination: Subscribe to Position updates (accounts/$id/positions)
        Unknown Destination -->> Unknown Source: Publish Position Updates
```
### Submitting a Trade Ticket

Flow for submitting a trade ticket and validating the trade, account, and publishing a new trade event.

```mermaid
sequenceDiagram
        web-gui-process ->> reference-data-service: Load ticker list
        reference-data-service -->> web-gui-process: Return ticker list
        web-gui-process ->> trading-services: Submit trade (acct, ticker, side, qty)
        trading-services ->> reference-data-service: Validate Ticker
        trading-services ->> accounts-service: Validate Account Number
        trading-services ->> trade-feed: Publish new Trade Event (trades/new)
        trading-services -->> web-gui-process: Trade Submission Complete
```
### Trade Processing - New Trade

The process flow for handling new trade events

```mermaid
sequenceDiagram
        trade-feed -->> trade-processor: New Trade Request (trades/new)
        trade-processor ->> traderx-db: Insert New Trade
        trade-processor ->> trade-feed: Publish New TradeEvent (accounts/$id/trades)
        trade-processor ->> trade-feed: Publish PositionEvent (accounts/$id/positions)
        trade-feed -->> web-gui-process: New Trade Created
        trade-feed -->> web-gui-process: Position Updated
```
### Trade Processing - Update Trade

The process flow for handling update trade events

```mermaid
sequenceDiagram
        trade-feed -->> trade-processor: Update Trade Request (trades/update)
        trade-processor ->> traderx-db: Update Trade
        trade-processor ->> trade-feed: Publish TradeUpdatedEvent (accounts/$id/trades)
        trade-processor ->> trade-feed: Publish PositionEvent (accounts/$id/positions)
        trade-feed -->> web-gui-process: Trade Updated
        trade-feed -->> web-gui-process: Position Updated
```

## Nodes
| Name      | Node Type | Description | Data Classification | Run As | Instance |
|-----------|-----------|-------------|---------------------|--------|----------|
| TraderX  | system | Simple Trading System |  |  |  |
| Trader  | actor | Person who manages accounts and executes trades |  |  |  |
| Web Client  | webclient | Browser based web interface for TraderX | Confidential | user |  |
| Web GUI  | service | Allows employees to manage accounts and book trades | Confidential | systemId |  |
| Position Service  | service | Server process which processes trading activity and updates positions | Confidential | systemId |  |
| TraderX DB  | database | Database which stores account, trade and position state | Confidential | systemId |  |
| Bank ABC Internal Network  | network | Internal network for Bank ABC |  |  | Internal Network |
| Reference Data Service  | service | Service which provides reference data | Confidential | systemId |  |
| Trading Services  | service | Service which provides trading services | Confidential | systemId |  |
| Trade Feed  | service | Message bus for streaming updates to trades and positions | Confidential | systemId |  |
| Trade Processor  | service | Process incoming trade requests, settle and persist | Confidential | systemId |  |
| Accounts Service  | service | Service which provides account management | Confidential | systemId |  |
| People Service  | service | Service which provides user details management | Confidential | systemId |  |
| User Directory  | ldap | Golden source of user data | PII | systemId |  |


## Relationships
| Name      | Node Type | Description | Data Classification | Run As | Instance |
|-----------|-----------|-------------|---------------------|--------|----------|
| TraderX  | system | Simple Trading System |  |  |  |
| Trader  | actor | Person who manages accounts and executes trades |  |  |  |
| Web Client  | webclient | Browser based web interface for TraderX | Confidential | user |  |
| Web GUI  | service | Allows employees to manage accounts and book trades | Confidential | systemId |  |
| Position Service  | service | Server process which processes trading activity and updates positions | Confidential | systemId |  |
| TraderX DB  | database | Database which stores account, trade and position state | Confidential | systemId |  |
| Bank ABC Internal Network  | network | Internal network for Bank ABC |  |  | Internal Network |
| Reference Data Service  | service | Service which provides reference data | Confidential | systemId |  |
| Trading Services  | service | Service which provides trading services | Confidential | systemId |  |
| Trade Feed  | service | Message bus for streaming updates to trades and positions | Confidential | systemId |  |
| Trade Processor  | service | Process incoming trade requests, settle and persist | Confidential | systemId |  |
| Accounts Service  | service | Service which provides account management | Confidential | systemId |  |
| People Service  | service | Service which provides user details management | Confidential | systemId |  |
| User Directory  | ldap | Golden source of user data | PII | systemId |  |


