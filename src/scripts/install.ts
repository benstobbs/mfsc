import { copyFileSync, mkdirSync } from "fs";
import { execFileSync } from "child_process";
import download = require('download');
import path = require("path");
import { execToolSync } from "../helpers";

const toolsDirectory = "./tools/";
const ossVersion = {
    y: "2022",
    m: "01",
    d: "30"
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

    console.log("Downloading OSS CAD Suite");

    await download(
        ossDownloadUrl,
        toolsDirectory,
        {
            extract: !isWindows,
            filename: "tools" + archiveExtension
        }
    );

    if (isWindows){
        console.log("Extracting OSS CAD Suite");

        execFileSync('tools.exe', [], {cwd: "tools"});
        execToolSync("gdk-pixbuf-query-loaders.exe", ["--update-cache"]);

        // Python SSL Patch
        copyFileSync(
            path.join(toolsDirectory, "oss-cad-suite", "lib", "libcrypto-1_1-x64.dll"),
            path.join(toolsDirectory, "oss-cad-suite", "lib", "python3.8", "lib-dynload", "libcrypto-1_1-x64.dll")
        );
        copyFileSync(
            path.join(toolsDirectory, "oss-cad-suite", "lib", "libssl-1_1-x64.dll"),
            path.join(toolsDirectory, "oss-cad-suite", "lib", "python3.8", "lib-dynload", "libssl-1_1-x64.dll")
        );
    }
}

async function installLitex(){
    const litexDirectory = path.resolve(toolsDirectory, "litex");

    try{
        mkdirSync(litexDirectory);
    } catch (Error) {}

    console.log("Downloading litex_setup.py");

    await download(
        litexSetupUrl,
        litexDirectory,
        {
            filename: "litex_setup.py"
        }
    );

    console.log("Installing litex");

    execToolSync("python3", ["litex_setup.py", "--init", "--install"], litexDirectory);
}

async function main(){
    await installOssCadSuite();
    await installLitex();

    console.log("Done installing!");
}

main();