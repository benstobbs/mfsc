import { rename, renameSync } from "fs";
import { execFile } from "child_process";
import download = require('download');

async function main (){
    const isWindows = process.platform === "win32";
    const exeExtension = isWindows ? ".exe" : "";

    await download(
        "https://github.com/YosysHQ/oss-cad-suite-build/releases/download/2022-01-26/oss-cad-suite-windows-x64-20220126.exe",
        "./tools/",
        {
            extract: !isWindows,
            filename: "tools" + exeExtension
        }
    );

    if (isWindows){
        execFile('tools.exe', [], {cwd: "tools"});
    }
}

main();