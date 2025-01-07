# TraderX
TraderX CALM Architecture

## Architecture
```mermaid
C4Container
title Container diagram for TraderX
        Person(traderx-trader, "Trader", "Person who manages accounts and executes trades")
        Container(web-client, "Web Client", "", "Browser based web interface for TraderX")
            Container(web-gui-process, "Web GUI", "", "Allows employees to manage accounts and book trades")
            Container(position-service, "Position Service", "", "Server process which processes trading activity and updates positions")
            ContainerDb(traderx-db, "TraderX DB", "", "Database which stores account, trade and position state")
        Container(internal-bank-network, "Bank ABC Internal Network", "", "Internal network for Bank ABC")
            Container(reference-data-service, "Reference Data Service", "", "Service which provides reference data")
            Container(trading-services, "Trading Services", "", "Service which provides trading services")
            Container(trade-feed, "Trade Feed", "", "Message bus for streaming updates to trades and positions")
            Container(trade-processor, "Trade Processor", "", "Process incoming trade requests, settle and persist")
            Container(accounts-service, "Accounts Service", "", "Service which provides account management")
            Container(people-service, "People Service", "", "Service which provides user details management")
            Container(user-directory, "User Directory", "", "Golden source of user data")
    
    Rel(web-client, web-gui-process, "Web client interacts with the Web GUI process.")
    Rel(web-gui-process, position-service, "Load positions for account.")
    Rel(web-gui-process, position-service, "Load trades for account.")
    Rel(position-service, traderx-db, "Looks up default positions for a given account.")
    Rel(position-service, traderx-db, "Looks up all trades for a given account.")
    Rel(web-gui-process, reference-data-service, "Looks up securities to assist with creating a trade ticket.")
    Rel(web-gui-process, trading-services, "Creates new trades and cancels existing trades.")
    Rel(web-gui-process, trade-feed, "Subscribes to trade/position updates feed for currently viewed account.")
    Rel(trade-processor, trade-feed, "Processes incoming trade requests, persist and publish updates.")
    Rel(trade-processor, traderx-db, "Looks up current positions when bootstrapping state, persist trade state and position state.")
    Rel(web-gui-process, accounts-service, "Creates/Updates accounts. Gets list of accounts.")
    Rel(web-gui-process, people-service, "Looks up people data based on typeahead from GUI.")
    Rel(people-service, user-directory, "Looks up people data.")
    Rel(trading-services, reference-data-service, "Validates securities when creating trades.")
    Rel(trading-services, trade-feed, "Publishes updates to trades and positions after persisting in the DB.")
    Rel(trading-services, accounts-service, "Validates accounts when creating trades.")
    Rel(accounts-service, traderx-db, "CRUD operations on account")
    Rel(traderx-trader, web-client, "Executes Trades")
    Rel(traderx-trader, web-client, "Manage Accounts")
    Rel(traderx-trader, web-client, "View Trade Status / Positions")

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
### Interacts Relationship

| Unique Id | Description | Actor    | Nodes                |
| ----------|----------|----------|----------------|
| trader-executes-trades | Executes Trades | traderx-trader | web-client |
| trader-manages-accounts | Manage Accounts | traderx-trader | web-client |
| trader-views-trade-status | View Trade Status / Positions | traderx-trader | web-client |

### Connect Relationships

|Unique Id | Description | Source    | Destination                |
| ----------|----------|----------|----------------|
| web-client-uses-web-gui | Web client interacts with the Web GUI process. | web-client | web-gui-process |
| web-gui-uses-position-service-for-position-queries | Load positions for account. | web-gui-process | position-service |
| web-gui-uses-position-service-for-trade-queries | Load trades for account. | web-gui-process | position-service |
| position-service-uses-traderx-db-for-positions | Looks up default positions for a given account. | position-service | traderx-db |
| position-service-uses-traderx-db-for-trades | Looks up all trades for a given account. | position-service | traderx-db |
| web-gui-process-uses-reference-data-service | Looks up securities to assist with creating a trade ticket. | web-gui-process | reference-data-service |
| web-gui-process-uses-trading-services | Creates new trades and cancels existing trades. | web-gui-process | trading-services |
| web-gui-process-uses-trade-feed | Subscribes to trade/position updates feed for currently viewed account. | web-gui-process | trade-feed |
| trade-processor-connects-to-trade-feed | Processes incoming trade requests, persist and publish updates. | trade-processor | trade-feed |
| trade-processor-connects-to-traderx-db | Looks up current positions when bootstrapping state, persist trade state and position state. | trade-processor | traderx-db |
| web-gui-process-uses-accounts-service | Creates/Updates accounts. Gets list of accounts. | web-gui-process | accounts-service |
| web-gui-process-uses-people-service | Looks up people data based on typeahead from GUI. | web-gui-process | people-service |
| people-service-connects-to-user-directory | Looks up people data. | people-service | user-directory |
| trading-services-connects-to-reference-data-service | Validates securities when creating trades. | trading-services | reference-data-service |
| trading-services-uses-trade-feed | Publishes updates to trades and positions after persisting in the DB. | trading-services | trade-feed |
| trading-services-uses-account-service | Validates accounts when creating trades. | trading-services | accounts-service |
| accounts-service-uses-traderx-db-for-accounts | CRUD operations on account | accounts-service | traderx-db |





