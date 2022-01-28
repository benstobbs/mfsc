import { execFileSync } from "child_process";
import path = require("path");
import { cwd } from "process";

export function installDirectory(){
    return path.resolve(__dirname, '../');
}

export function ossCadSuitePath(){
    return path.resolve(installDirectory(), "tools/oss-cad-suite/");
}

export function execToolSync(tool: string, args: string[] = [], cwd: string = "./"){
    const cadPath = ossCadSuitePath();
    const binPath = path.join(cadPath, "bin");
    const libPath = path.join(cadPath, "lib");
    const py3binPath = path.join(cadPath, "py3bin");

    const pathSeparator = process.platform === "win32" ? ";" : ":";

    const pathEnv = `${binPath}${pathSeparator}${libPath}${pathSeparator}${py3binPath}${pathSeparator}${process.env.PATH}`;

    if (process.platform !== "win32"){
        if (tool === "python3"){
            tool = "tabbypy3";
        }
        else if (tool === "pip" || tool === "pip3"){
            tool = "tabbypip";
        }
    }

    return execFileSync(
        tool,
        args,
        {
            env: {
                "PATH": pathEnv
            },
            cwd: cwd
        }    
    );
}