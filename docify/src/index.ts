import {Docify, DocifyMode, OutputFormat} from "./docify";
import * as fs from "fs";

const linksMap: Map<string, string> = new Map();
// Add links with placeholders for file paths
linksMap.set('https://calm.finos.org/draft/2024-12/meta/calm.json', '/Users/Leigh/IdeaProjects/architecture-as-code/calm/draft/2024-12/meta/calm.json');
linksMap.set('https://calm.finos.org/draft/2024-12/meta/core.json', '/Users/Leigh/IdeaProjects/architecture-as-code/calm/draft/2024-12/meta/core.json');
linksMap.set('https://calm.finos.org/draft/2024-12/meta/flow.json', '/Users/Leigh/IdeaProjects/architecture-as-code/calm/draft/2024-12/meta/flow.json');
linksMap.set('https://calm.finos.org/draft/2024-12/meta/control-requirement.json', '/Users/Leigh/IdeaProjects/architecture-as-code/calm/draft/2024-12/meta/control-requirement.json');
linksMap.set('https://calm.finos.org/draft/2024-12/meta/units.json#/defs/time-unit', '/Users/Leigh/IdeaProjects/architecture-as-code/calm/draft/2024-12/meta/units.json');
linksMap.set('https://calm.finos.org/draft/2024-12/meta/units.json', '/Users/Leigh/IdeaProjects/architecture-as-code/calm/draft/2024-12/meta/units.json');
linksMap.set('https://calm.finos.org/draft/2024-12/meta/flow.json', '/Users/Leigh/IdeaProjects/architecture-as-code/calm/draft/2024-12/meta/flow.json');
linksMap.set('https://calm.finos.org/traderx/flow/add-update-account', '/Users/Leigh/IdeaProjects/architecture-as-code/calm/samples/2024-12/traderx/flows/add-update-account/add-update-account.json');
linksMap.set('https://calm.finos.org/traderx/flow/load-list-of-accounts', '/Users/Leigh/IdeaProjects/architecture-as-code/calm/samples/2024-12/traderx/flows/load-list-of-accounts/load-list-of-accounts.json');
linksMap.set('https://calm.finos.org/traderx/flow/load-positions', '/Users/Leigh/IdeaProjects/architecture-as-code/calm/samples/2024-12/traderx/flows/load-positions/load-positions.json');
linksMap.set('https://calm.finos.org/traderx/flow/submit-trade-ticket/submit-trade-ticket', '/Users/Leigh/IdeaProjects/architecture-as-code/calm/samples/2024-12/traderx/flows/submit-trade-ticket/submit-trade-ticket.json');
linksMap.set('https://calm.finos.org/traderx/flow/new-trade', '/Users/Leigh/IdeaProjects/architecture-as-code/calm/samples/2024-12/traderx/flows/trade-processing/trade-processing-new-trade.json');
linksMap.set('https://calm.finos.org/traderx/flow/update-trade', '/Users/Leigh/IdeaProjects/architecture-as-code/calm/samples/2024-12/traderx/flows/trade-processing/trade-processing-update-trade.json');
linksMap.set('https://calm.finos.org/traderx/control/flow-sla-control-requirement', '/Users/Leigh/IdeaProjects/architecture-as-code/calm/samples/2024-12/traderx/controls/flow-sla-control-requirement.json')
linksMap.set('https://calm.finos.org/traderx/control/add-update-account-control-configuration', '/Users/Leigh/IdeaProjects/architecture-as-code/calm/samples/2024-12/traderx/flows/add-update-account/add-update-account-control-configuration.json')
linksMap.set('https://calm.finos.org/traderx/control/trade-processing-control-configuration', '/Users/Leigh/IdeaProjects/architecture-as-code/calm/samples/2024-12/traderx/flows/trade-processing/trade-processing-control-configuration.json')
linksMap.set('https://calm.finos.org/traderx/flow/submit-trade-ticket', '/Users/Leigh/IdeaProjects/architecture-as-code/calm/samples/2024-12/traderx/flows/submit-trade-ticket/submit-trade-ticket.json')
linksMap.set('https://calm.finos.org/traderx/flow/trade-processing-control-configuration', '/Users/Leigh/IdeaProjects/architecture-as-code/calm/samples/2024-12/traderx/flows/trade-processing/trade-processing-control-configuration.json')


const docify = new Docify(linksMap);


docify.execute("/Users/Leigh/IdeaProjects/architecture-as-code/calm/samples/2024-12/traderx/traderx.json", DocifyMode.OFFLINE, OutputFormat.WEBSITE)
    //.then(mdOutput => fs.writeFileSync("./sad-template.md", mdOutput))
    //  .then(mdOutput => console.log(`FINAL OUTPUT = ${mdOutput}`));
    .then(mdOutput => fs.writeFileSync("./mermaid-diagrams.md", mdOutput))
