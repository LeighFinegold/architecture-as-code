import {Docify, DocifyMode, OutputFormat} from "./docify";
import * as fs from "fs";

const linksMap: Map<string, string> = new Map();
// Add links with placeholders for file paths
linksMap.set('https://calm.finos.org/draft/2024-12/meta/calm.json', '/app/calm/draft/2024-12/meta/calm.json');
linksMap.set('https://calm.finos.org/draft/2024-12/meta/core.json', '/app/calm/draft/2024-12/meta/core.json');
linksMap.set('https://calm.finos.org/draft/2024-12/meta/flow.json', '/app/calm/draft/2024-12/meta/flow.json');
linksMap.set('https://calm.finos.org/draft/2024-12/meta/control-requirement.json', '/app/calm/draft/2024-12/meta/control-requirement.json');
linksMap.set('https://calm.finos.org/draft/2024-12/meta/units.json#/defs/time-unit', '/app/calm/draft/2024-12/meta/units.json');
linksMap.set('https://calm.finos.org/draft/2024-12/meta/units.json', '/app/calm/draft/2024-12/meta/units.json');
linksMap.set('https://calm.finos.org/draft/2024-12/meta/flow.json', '/app/calm/draft/2024-12/meta/flow.json');
linksMap.set('https://calm.finos.org/traderx/flow/add-update-account', '/app/calm/samples/2024-12/traderx/flows/add-update-account/add-update-account.json');
linksMap.set('https://calm.finos.org/traderx/flow/load-list-of-accounts', '/app/calm/samples/2024-12/traderx/flows/load-list-of-accounts/load-list-of-accounts.json');
linksMap.set('https://calm.finos.org/traderx/flow/load-positions', '/app/calm/samples/2024-12/traderx/flows/load-positions/load-positions.json');
linksMap.set('https://calm.finos.org/traderx/flow/submit-trade-ticket/submit-trade-ticket', '/app/calm/samples/2024-12/traderx/flows/submit-trade-ticket/submit-trade-ticket.json');
linksMap.set('https://calm.finos.org/traderx/flow/new-trade', '/app/calm/samples/2024-12/traderx/flows/trade-processing/trade-processing-new-trade.json');
linksMap.set('https://calm.finos.org/traderx/flow/update-trade', '/app/calm/samples/2024-12/traderx/flows/trade-processing/trade-processing-update-trade.json');
linksMap.set('https://calm.finos.org/traderx/control/flow-sla-control-requirement', '/app/calm/samples/2024-12/traderx/controls/flow-sla-control-requirement.json')
linksMap.set('https://calm.finos.org/traderx/control/add-update-account-control-configuration', '/app/calm/samples/2024-12/traderx/flows/add-update-account/add-update-account-control-configuration.json')
linksMap.set('https://calm.finos.org/traderx/control/trade-processing-control-configuration', '/app/calm/samples/2024-12/traderx/flows/trade-processing/trade-processing-control-configuration.json')
linksMap.set('https://calm.finos.org/traderx/flow/submit-trade-ticket', '/app/calm/samples/2024-12/traderx/flows/submit-trade-ticket/submit-trade-ticket.json')
linksMap.set('https://calm.finos.org/traderx/flow/trade-processing-control-configuration', '/app/calm/samples/2024-12/traderx/flows/trade-processing/trade-processing-control-configuration.json')


const docify = new Docify(linksMap);


docify.execute("/app/calm/samples/2024-12/traderx/traderx.json", DocifyMode.OFFLINE, OutputFormat.SAD_TEMPLATE)
    .then(mdOutput => fs.writeFileSync("./traderx-sad.md", mdOutput))
//  .then(mdOutput => console.log(`FINAL OUTPUT = ${mdOutput}`));
//.then(mdOutput => fs.writeFileSync("./mermaid-diagrams.md", mdOutput))
