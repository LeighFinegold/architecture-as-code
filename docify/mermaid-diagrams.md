## Add or Update Account

Flow for adding or updating account information in the database.

```mermaid
sequenceDiagram
        web-gui-process ->> accounts-service: Submit Account Create/Update
        accounts-service ->> traderx-db: inserts or updates account
        accounts-service -->> web-gui-process: Returns Account Create/Update Response Status
```

## Load List of Accounts

Flow for loading a list of accounts from the database to populate the GUI drop-down for user account selection.

```mermaid
sequenceDiagram
        web-gui-process ->> accounts-service: Load list of accounts
        accounts-service ->> traderx-db: Query for all Accounts
        traderx-db -->> accounts-service: Returns list of accounts
        accounts-service -->> web-gui-process: Returns list of accounts
```

## Load Positions

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

## Submitting a Trade Ticket

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

## Trade Processing - New Trade

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

## Trade Processing - Update Trade

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