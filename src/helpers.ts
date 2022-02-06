import { existsSync, mkdirSync } from "fs";
import path = require("path");
import { workspace } from "vscode";

export function getWorkspaceFolder(){
    const workspaceFolders = workspace.workspaceFolders;

    if (!workspaceFolders){
        return undefined;
    }

    return removeLeadingSlash(workspaceFolders[0].uri.path);
}

export function removeLeadingSlash(path: string){
    // \c:\... --> c:\...
    if (process.platform === "win32" && (path[0] === "\\" || path[0] == "/")){
        return path.slice(1);
    }
    return path;
}

export function getBuildFolder() {
    var workspacePath = getWorkspaceFolder();

    if (!workspacePath){
        return undefined;
    }

	var buildFolder = path.join(workspacePath, "build");

    buildFolder = removeLeadingSlash(buildFolder);

    if (!existsSync(buildFolder)){
        mkdirSync(buildFolder);
    }

    return buildFolder;
}