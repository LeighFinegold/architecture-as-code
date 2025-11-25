---
id: k8s-cluster
title: Kubernetes Cluster
architecture: /Users/leighfinegold/IdeaProjects/architecture-as-code/cli/test_fixtures/getting-started/STEP-3/conference-signup-with-flow.arch.json
node: nodes['k8s-cluster']
---
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
            <td><b>Unique Id</b></td>
            <td>
                <div class="table-container">
                    <table>
                        <tbody>
                        <tr>
                            <td><b>Value</b></td>
                            <td>
                                k8s-cluster
                                    </td>
                        </tr>
                        <tr>
                            <td><b>Unique Id</b></td>
                            <td>
                                unique-id
                                    </td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </td>
        </tr>
        <tr>
            <td><b>Node Type</b></td>
            <td>
                <div class="table-container">
                    <table>
                        <tbody>
                        <tr>
                            <td><b>Value</b></td>
                            <td>
                                system
                                    </td>
                        </tr>
                        <tr>
                            <td><b>Unique Id</b></td>
                            <td>
                                node-type
                                    </td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </td>
        </tr>
        <tr>
            <td><b>Name</b></td>
            <td>
                <div class="table-container">
                    <table>
                        <tbody>
                        <tr>
                            <td><b>Value</b></td>
                            <td>
                                Kubernetes Cluster
                                    </td>
                        </tr>
                        <tr>
                            <td><b>Unique Id</b></td>
                            <td>
                                name
                                    </td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </td>
        </tr>
        <tr>
            <td><b>Description</b></td>
            <td>
                <div class="table-container">
                    <table>
                        <tbody>
                        <tr>
                            <td><b>Value</b></td>
                            <td>
                                Kubernetes Cluster with network policy rules enabled
                                    </td>
                        </tr>
                        <tr>
                            <td><b>Unique Id</b></td>
                            <td>
                                description
                                    </td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </td>
        </tr>
        <tr>
            <td><b>Details</b></td>
            <td>
                <div class="table-container">
                    <table>
                        <tbody>
                        <tr>
                            <td><b>Unique Id</b></td>
                            <td>
                                details
                                    </td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </td>
        </tr>
        <tr>
            <td><b>Interfaces</b></td>
            <td>
                <div class="table-container">
                    <table>
                        <tbody>
                        <tr>
                            <td><b>Unique Id</b></td>
                            <td>
                                interfaces
                                    </td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </td>
        </tr>
        <tr>
            <td><b>Controls</b></td>
            <td>
                <div class="table-container">
                    <table>
                        <tbody>
                        <tr>
                            <td><b>Security</b></td>
                            <td>
                                <div class="table-container">
                                    <table>
                                        <tbody>
                                        <tr>
                                            <td><b>Description</b></td>
                                            <td>
                                                Security requirements for the Kubernetes cluster
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
                                                                https://calm.finos.org/getting-started/controls/micro-segmentation.requirement.json
                                                                    </td>
                                                        </tr>
                                                        <tr>
                                                            <td><b>$schema</b></td>
                                                            <td>
                                                                https://calm.finos.org/getting-started/controls/micro-segmentation.requirement.json
                                                                    </td>
                                                        </tr>
                                                        <tr>
                                                            <td><b>$id</b></td>
                                                            <td>
                                                                https://calm.finos.org/getting-started/controls/micro-segmentation.config.json
                                                                    </td>
                                                        </tr>
                                                        <tr>
                                                            <td><b>Control Id</b></td>
                                                            <td>
                                                                security-001
                                                                    </td>
                                                        </tr>
                                                        <tr>
                                                            <td><b>Name</b></td>
                                                            <td>
                                                                Micro-segmentation of Kubernetes Cluster
                                                                    </td>
                                                        </tr>
                                                        <tr>
                                                            <td><b>Description</b></td>
                                                            <td>
                                                                Micro-segmentation in place to prevent lateral movement outside of permitted flows
                                                                    </td>
                                                        </tr>
                                                        <tr>
                                                            <td><b>Permit Ingress</b></td>
                                                            <td>
                                                                true
                                                                    </td>
                                                        </tr>
                                                        <tr>
                                                            <td><b>Permit Egress</b></td>
                                                            <td>
                                                                false
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
                            <td><b>Unique Id</b></td>
                            <td>
                                controls
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
                            <td><b>Unique Id</b></td>
                            <td>
                                metadata
                                    </td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </td>
        </tr>
        <tr>
            <td><b>AdditionalProperties</b></td>
            <td>
                <div class="table-container">
                    <table>
                        <tbody>
                        <tr>
                            <td><b>Unique Id</b></td>
                            <td>
                                additionalProperties
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


