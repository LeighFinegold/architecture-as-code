import {Docify, DocifyMode, OutputFormat} from "./docify";
import * as fs from "fs";

const docify = new Docify();

docify.execute("/Users/Leigh/IdeaProjects/architecture-as-code/calm/samples/2024-12/traderx/traderx.json", DocifyMode.OFFLINE, OutputFormat.SAD_TEMPLATE)
    .then(mdOutput => fs.writeFileSync("./sad-template.md", mdOutput) )
