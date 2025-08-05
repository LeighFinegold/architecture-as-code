## Nodes

[
{
"unique-id": "document-system",
"node-type": "system",
"name": "DocuFlow",
"description": "Main document management system",
"controls": {
"ownership": {
"description": "Ownership Controls",
"requirements": [
{
"requirement-url": "https://calm.finos.org/controls/owner.requirement.json",
"$schema": "https://calm.finos.org/controls/owner-responsibility.requirement.json",
"$id": "https://calm.finos.org/controls/architect.configuration.json",
"control-id": "ownership-003",
"name": "Architect Responsibility",
"description": "Captures who is responsible for architecture",
"owner-type": "System Owner",
"owner": {
"name": "Mr Architect",
"email": "mr.architect@finos.org"
}
}
]
}
},
"metadata": {
"arch-health": "BUY"
}
},
{
"unique-id": "svc-upload",
"node-type": "service",
"name": "Upload Service",
"description": "Handles user document uploads",
"metadata": {
"arch-health": "BUY"
}
},
{
"unique-id": "svc-storage",
"node-type": "service",
"name": "Storage Service",
"description": "Stores and retrieves documents securely",
"metadata": {
"arch-health": "HOLD"
}
},
{
"unique-id": "db-docs",
"node-type": "database",
"name": "Document Database",
"description": "Stores metadata and document references",
"metadata": {
"arch-health": "SELL"
}
}
]

<div class="table-container">
    <table>
        <thead>
        <tr>
            <th>Key</th>
            <th>Value</th>
        </tr>
        </thead>
        <tbody>
        <tr>
            <td><b>Document System</b></td>
            <td>
                <div class="table-container">
                    <table>
                        <tbody>
                        <tr>
                            <td><b>Unique Id</b></td>
                            <td>
                                document-system
                                    </td>
                        </tr>
                        <tr>
                            <td><b>Node Type</b></td>
                            <td>
                                system
                                    </td>
                        </tr>
                        <tr>
                            <td><b>Name</b></td>
                            <td>
                                DocuFlow
                                    </td>
                        </tr>
                        <tr>
                            <td><b>Description</b></td>
                            <td>
                                Main document management system
                                    </td>
                        </tr>
                        <tr>
                            <td><b>Controls</b></td>
                            <td>
                                <div class="table-container">
                                    <table>
                                        <tbody>
                                        <tr>
                                            <td><b>Ownership</b></td>
                                            <td>
                                                <div class="table-container">
                                                    <table>
                                                        <tbody>
                                                        <tr>
                                                            <td><b>Description</b></td>
                                                            <td>
                                                                Ownership Controls
                                                                    </td>
                                                        </tr>
                                                        <tr>
                                                            <td><b>Requirements</b></td>
                                                            <td>
                                                                        <div class="table-container">
                                                                            <table>
                                                                                <tbody>
                                                                                <tr>
                                                                                    <td><b>Requirement Url</b></td>
                                                                                    <td>
                                                                                        https://calm.finos.org/controls/owner.requirement.json
                                                                                            </td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td><b>$schema</b></td>
                                                                                    <td>
                                                                                        https://calm.finos.org/controls/owner-responsibility.requirement.json
                                                                                            </td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td><b>$id</b></td>
                                                                                    <td>
                                                                                        https://calm.finos.org/controls/architect.configuration.json
                                                                                            </td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td><b>Control Id</b></td>
                                                                                    <td>
                                                                                        ownership-003
                                                                                            </td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td><b>Name</b></td>
                                                                                    <td>
                                                                                        Architect Responsibility
                                                                                            </td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td><b>Description</b></td>
                                                                                    <td>
                                                                                        Captures who is responsible for architecture
                                                                                            </td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td><b>Owner Type</b></td>
                                                                                    <td>
                                                                                        System Owner
                                                                                            </td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td><b>Owner</b></td>
                                                                                    <td>
                                                                                        <div class="table-container">
                                                                                            <table>
                                                                                                <tbody>
                                                                                                <tr>
                                                                                                    <td><b>Name</b></td>
                                                                                                    <td>
                                                                                                        Mr Architect
                                                                                                            </td>
                                                                                                </tr>
                                                                                                <tr>
                                                                                                    <td><b>Email</b></td>
                                                                                                    <td>
                                                                                                        mr.architect@finos.org
                                                                                                            </td>
                                                                                                </tr>
                                                                                                </tbody>
                                                                                            </table>
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                            </td>
                                                        </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td><b>Metadata</b></td>
                            <td>
                                <div class="table-container">
                                    <table>
                                        <tbody>
                                        <tr>
                                            <td><b>Arch Health</b></td>
                                            <td>
                                                BUY
                                                    </td>
                                        </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </td>
        </tr>
        <tr>
            <td><b>Svc Upload</b></td>
            <td>
                <div class="table-container">
                    <table>
                        <tbody>
                        <tr>
                            <td><b>Unique Id</b></td>
                            <td>
                                svc-upload
                                    </td>
                        </tr>
                        <tr>
                            <td><b>Node Type</b></td>
                            <td>
                                service
                                    </td>
                        </tr>
                        <tr>
                            <td><b>Name</b></td>
                            <td>
                                Upload Service
                                    </td>
                        </tr>
                        <tr>
                            <td><b>Description</b></td>
                            <td>
                                Handles user document uploads
                                    </td>
                        </tr>
                        <tr>
                            <td><b>Metadata</b></td>
                            <td>
                                <div class="table-container">
                                    <table>
                                        <tbody>
                                        <tr>
                                            <td><b>Arch Health</b></td>
                                            <td>
                                                BUY
                                                    </td>
                                        </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </td>
        </tr>
        <tr>
            <td><b>Svc Storage</b></td>
            <td>
                <div class="table-container">
                    <table>
                        <tbody>
                        <tr>
                            <td><b>Unique Id</b></td>
                            <td>
                                svc-storage
                                    </td>
                        </tr>
                        <tr>
                            <td><b>Node Type</b></td>
                            <td>
                                service
                                    </td>
                        </tr>
                        <tr>
                            <td><b>Name</b></td>
                            <td>
                                Storage Service
                                    </td>
                        </tr>
                        <tr>
                            <td><b>Description</b></td>
                            <td>
                                Stores and retrieves documents securely
                                    </td>
                        </tr>
                        <tr>
                            <td><b>Metadata</b></td>
                            <td>
                                <div class="table-container">
                                    <table>
                                        <tbody>
                                        <tr>
                                            <td><b>Arch Health</b></td>
                                            <td>
                                                HOLD
                                                    </td>
                                        </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </td>
        </tr>
        <tr>
            <td><b>Db Docs</b></td>
            <td>
                <div class="table-container">
                    <table>
                        <tbody>
                        <tr>
                            <td><b>Unique Id</b></td>
                            <td>
                                db-docs
                                    </td>
                        </tr>
                        <tr>
                            <td><b>Node Type</b></td>
                            <td>
                                database
                                    </td>
                        </tr>
                        <tr>
                            <td><b>Name</b></td>
                            <td>
                                Document Database
                                    </td>
                        </tr>
                        <tr>
                            <td><b>Description</b></td>
                            <td>
                                Stores metadata and document references
                                    </td>
                        </tr>
                        <tr>
                            <td><b>Metadata</b></td>
                            <td>
                                <div class="table-container">
                                    <table>
                                        <tbody>
                                        <tr>
                                            <td><b>Arch Health</b></td>
                                            <td>
                                                SELL
                                                    </td>
                                        </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </td>
        </tr>
        </tbody>
    </table>
</div>


| ID            | Name           | Type     | Description                          |
|---------------|----------------|----------|--------------------------------------|
| document-system | DocuFlow       | system | Main document management system |
| svc-upload | Upload Service       | service | Handles user document uploads |
| svc-storage | Storage Service       | service | Stores and retrieves documents securely |
| db-docs | Document Database       | database | Stores metadata and document references |

## Relationships

| ID               | Type         | Source       | Destination / Parts | Description |
|------------------|--------------|---------------|----------------------|-------------|
| rel-upload-to-storage | connects      | svc-upload | svc-storage | Upload Service sends documents to Storage Service for long-term storage |
| rel-storage-to-db | connects      | svc-storage | db-docs | Storage Service stores document metadata in the Document Database |
| document-system-system-is-composed-of | composed-of   | document-system | svc-upload, svc-storage, db-docs |  |


## Ownership Controls

| Owner Type      | Name        | Email               | Description                        |
|-----------------|-------------|---------------------|------------------------------------|
| Business Owner | Jo Bloggs | jo.bloggs@finos.org | Captures who is responsible from business perspective |
| System Owner | Jane Doe | jane.doe@finos.org | Captures who is responsible from system ownership |
| Data Owner | Captain Data | captain.data@finos.org | Captures who is responsible for data captain |

## Metadata
```
{
  "arch-health": "BUY",
  "$id": "docuflow-architecture",
  "title": "DocuFlow System",
  "description": "DocuFlow is a document management system that allows users to upload, process, and store documents securely."
}
```