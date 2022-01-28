import { execFileSync } from "child_process";
import path = require("path");

export function installDirectory(){
    return path.resolve(__dirname, '../');
}

export function ossCadSuitePath(){
    return path.resolve(installDirectory(), "tools/oss-cad-suite/");
}

export function execToolSync(tool: string, args: string[] = []){
    const cadPath = ossCadSuitePath();
    const binPath = path.join(cadPath, "bin");
    const libPath = path.join(cadPath, "lib");
    const py3binPath = path.join(cadPath, "py3bin");

    const pathSeparator = process.platform === "win32" ? ";" : ":";

    const pathEnv = `${binPath}${pathSeparator}${libPath}${pathSeparator}${py3binPath}${pathSeparator}${process.env}`;

    console.log(`Finding tool ${tool} with PATH = ${pathEnv}`);
    return execFileSync(tool, args, {"env": {"PATH": pathEnv}});
}