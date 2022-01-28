import { mkdirSync } from "fs";
import { execFileSync } from "child_process";
import download = require('download');
import path = require("path");
import { execToolSync } from "../helpers";

const toolsDirectory = "./tools/";
const ossVersion = {
    y: "2022",
    m: "01",
    d: "26"
};
const litexSetupUrl = "https://raw.githubusercontent.com/enjoy-digital/litex/master/litex_setup.py";
const isWindows = process.platform === "win32";


async function installOssCadSuite(){
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
        toolsDirectory,
        {
            extract: !isWindows,
            filename: "tools" + archiveExtension
        }
    );

    if (isWindows){
        execFileSync('tools.exe', [], {cwd: "tools"});
    }
}

async function installLitex(){
    if (isWindows){
        execToolSync("gdk-pixbuf-query-loaders.exe", ["--update-cache"]);
    }

    const litexDirectory = path.resolve(toolsDirectory, "litex");

    try{
        mkdirSync(litexDirectory);
    } catch (Error) {}

    await download(
        litexSetupUrl,
        litexDirectory,
        {
            filename: "litex_setup.py"
        }
    );

    execToolSync("python3", ["litex_setup.py", "--init", "--install"], litexDirectory);
}

async function main(){
    await installOssCadSuite();
    await installLitex();
}

main();