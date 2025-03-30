---
id: index
title: Welcome to CALM Documentation
sidebar_position: 1
slug: /
---

# Welcome to CALM Documentation

This documentation is generated from the **CALM Architecture-as-Code** model.

## High Level Architecture
```mermaid
C4Container

            Container(conference-website,"Conference Website","","Website to sign up for a conference")

            Container(load-balancer,"Load Balancer","","Ingress for the Kubernetes cluster")

            Container(attendees-service,"Attendees Service","","Ingress for the Kubernetes cluster")

            Container(advertising,"Advertising","","Reviews attendees and filters based on interest to create advertisements")

            Container(attendees-store,"Attendees Store","","Persistent storage for attendees")

    Rel(conference-website,load-balancer,"Connects To")
    Rel(load-balancer,attendees-service,"Connects To")
    Rel(attendees-service,attendees-store,"Connects To")
    Rel(advertising,attendees-store,"Connects To")

UpdateLayoutConfig($c4ShapeInRow="2", $c4BoundaryInRow="0")
```
### Nodes
    - [Conference Website](nodes/conference-website)
    - [Load Balancer](nodes/load-balancer)
    - [Attendees Service](nodes/attendees-service)
    - [Advertising](nodes/advertising)
    - [Attendees Store](nodes/attendees-store)

### Flows

### Controls

| ID    | Name             | Description                  | Domain    | Scope        | Applied To                |
|-------|------------------|------------------------------|-----------|--------------|---------------------------|
