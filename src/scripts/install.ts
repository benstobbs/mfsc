import { rename, renameSync } from "fs";
import { execFile } from "child_process";
import download = require('download');

const ossVersion = {
    y: "2022",
    m: "01",
    d: "26"
};

async function main (){
    const isWindows = process.platform === "win32";
    const archiveExtension = isWindows ? ".exe" : ".tgz";
    var ossUrlOS;

    switch(process.platform){
        case "win32": {ossUrlOS = "windows"; break;}
        case "darwin": {ossUrlOS = "darwin"; break;}
        case "linux": {ossUrlOS = "linux"; break;}
        default: {
            throw new Error('Unsupported operating system.');
        }
    }

    const ossDownloadUrl = `https://github.com/YosysHQ/oss-cad-suite-build/releases/download/${ossVersion.y}-${ossVersion.m}-${ossVersion.d}/oss-cad-suite-${ossUrlOS}-x64-${ossVersion.y}${ossVersion.m}${ossVersion.d}${archiveExtension}`;

    await download(
        ossDownloadUrl,
        "./tools/",
        {
            extract: !isWindows,
            filename: "tools" + archiveExtension
        }
    );

    if (isWindows){
        execFile('tools.exe', [], {cwd: "tools"});
    }
}

main();