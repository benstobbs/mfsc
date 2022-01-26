import * as assert from 'assert';
import { execFile } from "child_process";
import { toolPath } from "../../helpers";


suite('Check tools exist', () => {
    const tools = ["yosys", "nextpnr-ecp5", "ecppack"];

    tools.forEach(function(tool){
        test(tool, () => {
            execFile(toolPath(tool), function(error){
                assert.strictEqual(error, null);
            });
        });
    });	
});
