import { execFileSync } from "child_process";
import { readdirSync } from "fs";
import { join } from "path";
import path = require("path");


export function installDirectory(){
    return path.resolve(__dirname, '../');
}

export function ossCadSuitePath(){
    return path.join(installDirectory(), "tools", "oss-cad-suite");
}

export function litexPath(){
    return path.join(installDirectory(), "tools", "litex");
}

export function execToolSync(tool: string, args: string[] = [], cwd: string = "./"){
    const cadPath = ossCadSuitePath();
    const binPath = path.join(cadPath, "bin");
    const libPath = path.join(cadPath, "lib");
    const py3binPath = path.join(cadPath, "py3bin");
    const riscvBinPath = path.join(installDirectory(), "tools", "riscv-none-embed-gcc", "bin");

    const isWindows = process.platform === "win32";

    const pathSeparator = isWindows ? ";" : ":";

    const pathEnv =
        binPath + pathSeparator +
        libPath + pathSeparator +
        py3binPath + pathSeparator +
        riscvBinPath + pathSeparator +
        process.env.PATH;

    if (!isWindows){
        if (tool === "python3"){
            tool = "tabbypy3";
        }
        else if (tool === "pip" || tool === "pip3"){
            tool = "tabbypip";
        }
    }

    const pythonPath = readdirSync(litexPath(), { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
        .map(name => path.join(litexPath(), name))
        .join(pathSeparator);


    return execFileSync(
        tool,
        args,
        {
            env: {
                /* eslint-disable @typescript-eslint/naming-convention */
                "PATH": pathEnv,
                "PATHEXT" : isWindows ? ".EXE" : "",
                "PYTHONEXECUTABLE": isWindows ? path.join(cadPath, "py3bin", "python3") : path.join(binPath, "tabbypy3"),
                "PYTHONHOME": cadPath,
                "PYTHONPATH": pythonPath,
                "PYTHONNOUSERSITE": "1",
                "SSL_CERT_FILE": path.join(cadPath, "etc", "cacert.pem"),
                "QT_PLUGIN_PATH": path.join(libPath, "qt5", "plugins"),
                "QT_LOGGING_RULES": "*=false",
                "GTK_EXE_PREFIX": cadPath,
                "GTK_DATA_PREFIX": cadPath,
                "GDK_PIXBUF_MODULEDIR": path.join(libPath, "gdk-pixbuf-2.0", "2.10.0", "loaders"),
                "GDK_PIXBUF_MODULE_FILE": path.join(libPath, "gdk-pixbuf-2.0", "2.10.0", "loaders.cache")
                /* eslint-enable @typescript-eslint/naming-convention */
            },
            cwd: cwd
        }    
    );
}