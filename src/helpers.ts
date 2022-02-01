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

    const isWindows = process.platform === "win32";

    const pathSeparator = isWindows ? ";" : ":";

    const pathEnv = `${binPath}${pathSeparator}${libPath}${pathSeparator}${py3binPath}${pathSeparator}${process.env.PATH}`;

    // if (!isWindows){
    //     if (tool === "python3"){
    //         tool = "tabbypy3";
    //     }
    //     else if (tool === "pip" || tool === "pip3"){
    //         tool = "tabbypip";
    //     }
    // }

    console.log(`Executing tool ${tool} with args ${args} and PATH = ${pathEnv}`);

    return execFileSync(
        tool,
        args,
        {
            env: {
                /* eslint-disable @typescript-eslint/naming-convention */
                "PATH": pathEnv,
                "PYTHONEXECUTABLE": isWindows ? path.join(cadPath, "py3bin", "python3") : path.join(binPath, "tabbypy3"),
                "PYTHONHOME": cadPath,
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