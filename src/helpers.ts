import { execFile, ExecFileException, execFileSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import path = require("path");
import { ProgressLocation, window, workspace } from "vscode";

export function dockerExec(command: string[], progressTitle: string = "Working", progressDone: string = "Done!"){
    // ensure container clock is synchrononised with host
    execFileSync("docker", ["run", "--rm", "--privileged", "benstobbs/litex-runner", "hwclock", "-s"]);

    const workspaceFolder = getWorkspaceFolder();

    const args = [
        "run",
        "--rm",
        "-v",
        `${workspaceFolder}:/project`,
        "benstobbs/litex-runner"
    ]
    .concat(command);

    return window.withProgress({
        location: ProgressLocation.Notification,
        title: progressTitle,
        cancellable: false
    }, () => {	
        const p = new Promise<void>(resolve => {
            execFile("docker", args, {maxBuffer: 100 * 1024 * 1024}, (error: ExecFileException | null) => {
                if (error){
                    window.showErrorMessage(error.message);
                }
                else{
                    window.showInformationMessage(progressDone);
                }
                resolve();
            });
        });
        return p;
    });
}

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