import path = require("path");

export function installDirectory(){
    return path.resolve(__dirname, '../');
}

export function toolBinariesPath(){
    return path.resolve(installDirectory(), "tools/oss-cad-suite/bin/");
}

export function toolPath(tool: string){
    return path.resolve(toolBinariesPath(), tool);
}