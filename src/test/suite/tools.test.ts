import { execToolSync } from "../../helpers";


suite('Check tools exist', () => {
    const tools = ["yosys", "nextpnr-ecp5", "ecppack"];

    tools.forEach(function(tool){
        test(tool, () => {
            execToolSync(tool, ["-h"]);
        });
    });	
});
