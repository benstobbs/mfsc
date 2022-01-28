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
    const pathEnv = `${binPath};${libPath};${py3binPath};%PATH%`;

    return execFileSync(tool, args, {"env": {"PATH": pathEnv}});
}