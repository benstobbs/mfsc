import { existsSync, mkdirSync } from "fs";
import path = require("path");
import { workspace } from "vscode";

export function getBuildFolder() {
    const workspaceFolders = workspace.workspaceFolders;

    if (!workspaceFolders){
        return undefined;
    }

    const workspacePath = workspaceFolders[0].uri.path;
	var buildFolder = path.join(workspacePath, "build");

    // \c:\... --> c:\...
    if (process.platform === "win32" && buildFolder[0] === "\\"){
        buildFolder = buildFolder.slice(1);
    }

    if (!existsSync(buildFolder)){
        mkdirSync(buildFolder);
    }

    return buildFolder;
}